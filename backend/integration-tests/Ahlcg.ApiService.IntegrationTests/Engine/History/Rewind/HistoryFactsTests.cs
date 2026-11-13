using Ahlcg.ApiService.IntegrationTests.Fixture;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using Tablier.Contract;
using Tablier.Data;
using Tablier.Engine.History;
using Tablier.Engine.History.Cleanup;
using Tablier.Engine.History.Rewind;

namespace Ahlcg.ApiService.IntegrationTests.Engine.History.Rewind;

[Collection(AppCollection.Name)]
public class HistoryFactsTests(AppFixture fixture)
{
    [Fact]
    public async Task GetHistorySummary_MultipleLatestTags_KeepsHeadOccurrenceUntilNextStep()
    {
        await using var run = await Begin();
        await run.Append(["turn", "phase"], "a");
        await run.Append(["turn", "round", "turn"], "b");

        var summary = Assert.IsType<HistorySummary>(await run.History.GetHistorySummary(run.GameId, 2));

        Assert.Equal(3, summary.Checkpoints.Count);
        Assert.Equal(2, summary.Checkpoints["turn"]);
        Assert.Equal(2, summary.Checkpoints["round"]);
        Assert.Equal(1, summary.Checkpoints["phase"]);
        Assert.Equal(new HistoryAction(2, "b"), summary.LastAction);
        Assert.DoesNotContain(summary.GetTargets(), target => target.CheckpointId == "turn");
        await run.Append([]);
        var later = Assert.IsType<HistorySummary>(await run.History.GetHistorySummary(run.GameId, 3));
        Assert.Contains(new HistoryTarget("turn", 2), later.GetTargets());
        Assert.Equal(new HistoryAction(2, "b"), later.LastAction);
    }

    [Fact]
    public async Task Rewind_DestinationWithMultipleTags_RecoversEarlierIdsAndExactSnapshot()
    {
        await using var run = await Begin();
        await run.Append(["turn"], "a");
        await run.Append(["phase", "round"], "b");
        var destinationState = run.Current.State;
        var destinationSummary = Assert.IsType<HistorySummary>(await run.History.GetHistorySummary(run.GameId, 2));
        await run.Append(["turn"], "c");

        await run.Rewind(2);

        Assert.Equal(destinationState, run.Current.State);
        await using var reader = fixture.CreateDbContext();
        var step = await reader.GameSteps.SingleAsync(s => s.GameId == run.GameId && s.Version == 4);
        Assert.Equal(["phase", "round"], step.Checkpoints);
        Assert.Equal(2, step.RestoredVersion);
        Assert.Null(step.Actor);
        Assert.False(step.IsBaseline);
        Assert.False(step.IsIrreversible);
        var snapshot = await reader.GameSnapshots.SingleAsync(s => s.GameId == run.GameId && s.Version == 4);
        Assert.Equal(destinationState.Counter, snapshot.State.RootElement.GetProperty("Counter").GetInt32());
        var summary = Assert.IsType<HistorySummary>(await run.History.GetHistorySummary(run.GameId, 4));
        Assert.Equal(3, summary.Checkpoints.Count);
        Assert.Equal(1, summary.Checkpoints["turn"]);
        Assert.Equal(4, summary.Checkpoints["phase"]);
        Assert.Equal(4, summary.Checkpoints["round"]);
        Assert.Equal(new HistoryAction(2, "b"), summary.LastAction);
        AssertSummary(destinationSummary.ApplyRewind(4), summary);
        Assert.Contains(new HistoryTarget("undo", 1), summary.GetTargets());
        Assert.DoesNotContain(summary.GetTargets(), target => target.Version == 2);
        Assert.Null(await run.History.Rewind(run.GameId, run.Current, 2));
        Assert.Equal(new StoredState<TestState>(2, destinationState), await run.History.LoadAt(run.GameId, 2));
    }

    [Fact]
    public async Task GetActorsForRange_NestedAliases_CountsOriginalActorsWithoutRequesterFiltering()
    {
        await using var run = await Begin();
        await run.Append(["turn"], "requester");
        await run.Append(["phase"], "guest");
        await run.Append([], "undone");
        await run.Rewind(2);
        await run.Append([]);
        await run.Rewind(4);
        await run.Append([], "requester");
        await run.Append([]);

        var actors = await run.History.GetActorsForRange(run.GameId, 0, 8);
        var tailActors = await run.History.GetActorsForRange(run.GameId, 1, 8);
        var aliasActors = await run.History.GetActorsForRange(run.GameId, 1, 6);
        var emptyActors = await run.History.GetActorsForRange(run.GameId, 7, 8);
        var summary = Assert.IsType<HistorySummary>(await run.History.GetHistorySummary(run.GameId, 6));

        Assert.NotNull(actors);
        Assert.True(actors.SetEquals(["requester", "guest"]));
        Assert.NotNull(tailActors);
        Assert.True(tailActors.SetEquals(["requester", "guest"]));
        Assert.NotNull(aliasActors);
        Assert.True(aliasActors.SetEquals(["guest"]));
        Assert.NotNull(emptyActors);
        Assert.Empty(emptyActors);
        Assert.Equal(new HistoryAction(2, "guest"), summary.LastAction);
        Assert.Equal(6, summary.Checkpoints["phase"]);
        Assert.Equal([new HistoryTarget("turn", 1), new HistoryTarget("undo", 1)], summary.GetTargets());
    }

    [Fact]
    public async Task GetHistorySummary_RewindSkipsEarlierRewind_DiscardsItsRepresentedAction()
    {
        await using var run = await Begin();
        await run.Append(["turn"], "a");
        await run.Append(["phase"], "b");
        await run.Append([], "c");
        await run.Rewind(2);
        await run.Append([], "d");

        await run.Rewind(1);
        await run.Append([]);

        var summary = Assert.IsType<HistorySummary>(await run.History.GetHistorySummary(run.GameId, 7));
        Assert.Single(summary.Checkpoints);
        Assert.Equal(6, summary.Checkpoints["turn"]);
        Assert.Equal(new HistoryAction(1, "a"), summary.LastAction);
        Assert.Equal([new HistoryTarget("turn", 6)], summary.GetTargets());
        var actors = await run.History.GetActorsForRange(run.GameId, 0, 7);
        Assert.NotNull(actors);
        Assert.True(actors.SetEquals(["a"]));
    }

    [Theory]
    [InlineData(false, false)]
    [InlineData(false, true)]
    [InlineData(true, false)]
    [InlineData(true, true)]
    public async Task GetHistorySummary_BarrierAndCleanup_AgreesWithIncrementalFacts(bool baseline, bool playerAction)
    {
        await using var run = await Begin();
        await run.Append(["old"], "a");
        await run.Append(["barrier"], playerAction ? "b" : null, irreversible: !baseline, baseline: baseline);
        await run.Append([]);
        var incremental = HistorySummary
            .Empty.ApplyStep(new StepMetadata(1, ["old"], "a"))
            .ApplyStep(new StepMetadata(2, ["barrier"], playerAction ? "b" : null, IsBarrier: true))
            .ApplyStep(new StepMetadata(3, []));
        var before = Assert.IsType<HistorySummary>(await run.History.GetHistorySummary(run.GameId, 3));
        await using var cleanerDb = fixture.CreateDbContext();

        await new GameHistoryCleanup(cleanerDb, NullLogger<GameHistoryCleanup>.Instance).Run(CancellationToken.None);

        var after = Assert.IsType<HistorySummary>(await run.History.GetHistorySummary(run.GameId, 3));
        AssertSummary(incremental, before);
        AssertSummary(incremental, after);
        Assert.Equal(2, after.BarrierVersion);
        Assert.Equal(playerAction ? new HistoryAction(2, "b") : null, after.LastAction);
        Assert.Equal([new HistoryTarget("barrier", 2)], after.GetTargets());
        Assert.Null(await run.History.GetHistorySummary(run.GameId, 1));
        Assert.Null(await run.History.Rewind(run.GameId, run.Current, 1));
    }

    [Fact]
    public async Task GetHistorySummary_MissingAndGappedHeads_RefusesInsteadOfReturningEmptyFacts()
    {
        await using var run = await Begin();
        Assert.NotNull(await run.History.GetHistorySummary(run.GameId, 0));
        Assert.Null(await run.History.GetHistorySummary(Guid.NewGuid(), 0));
        await run.Append([]);
        await run.Append([]);
        await run.Append([]);
        await using var reader = fixture.CreateDbContext();
        await reader.GameSteps.Where(s => s.GameId == run.GameId && s.Version == 2).ExecuteDeleteAsync();

        Assert.Null(await run.History.GetHistorySummary(run.GameId, 2));
        Assert.Null(await run.History.GetHistorySummary(run.GameId, 3));
        Assert.Null(await run.History.GetHistorySummary(run.GameId, 4));
        Assert.Null(await run.History.GetActorsForRange(run.GameId, 0, 3));
        Assert.Null(await run.History.GetActorsForRange(Guid.NewGuid(), 0, 1));
    }

    [Fact]
    public async Task GetHistorySummary_OnlyReconstructionSnapshotMissing_RefusesBothFactReads()
    {
        await using var run = await Begin();
        await run.Append([]);
        await run.Append([]);
        Assert.Equal(new StoredState<TestState>(2, new TestState(2)), await run.History.LoadAt(run.GameId, 2));
        Assert.Empty(Assert.IsType<HistorySummary>(await run.History.GetHistorySummary(run.GameId, 2)).Checkpoints);
        var actorsBefore = await run.History.GetActorsForRange(run.GameId, 0, 2);
        Assert.NotNull(actorsBefore);
        Assert.Empty(actorsBefore);
        await using var reader = fixture.CreateDbContext();

        await reader.GameSnapshots.Where(snapshot => snapshot.GameId == run.GameId).ExecuteDeleteAsync();

        Assert.Null(await run.History.LoadAt(run.GameId, 2));
        Assert.Null(await run.History.GetHistorySummary(run.GameId, 2));
        Assert.Null(await run.History.GetActorsForRange(run.GameId, 0, 2));
    }

    [Fact]
    public async Task GetHistorySummary_PhysicalGapInsideReplacedSpan_RefusesBothFactReads()
    {
        await using var run = await Begin();
        await run.Append([]);
        await run.Append([]);
        await run.Append([]);
        await run.Rewind(1);
        Assert.Equal(new StoredState<TestState>(4, new TestState(1)), await run.History.LoadAt(run.GameId, 4));
        Assert.Empty(Assert.IsType<HistorySummary>(await run.History.GetHistorySummary(run.GameId, 4)).Checkpoints);
        var actorsBefore = await run.History.GetActorsForRange(run.GameId, 0, 4);
        Assert.NotNull(actorsBefore);
        Assert.Empty(actorsBefore);
        await using var reader = fixture.CreateDbContext();
        Assert.Equal(
            [0],
            await reader
                .GameSnapshots.Where(snapshot => snapshot.GameId == run.GameId)
                .Select(snapshot => snapshot.Version)
                .ToListAsync()
        );

        await reader.GameSteps.Where(step => step.GameId == run.GameId && step.Version == 2).ExecuteDeleteAsync();

        Assert.Null(await run.History.LoadAt(run.GameId, 4));
        Assert.Null(await run.History.GetHistorySummary(run.GameId, 4));
        Assert.Null(await run.History.GetActorsForRange(run.GameId, 0, 4));
    }

    [Fact]
    public async Task Rewind_AfterCleanupAndRepeatedAlias_PreservesEveryTagAndOriginalAction()
    {
        await using var run = await Begin();
        await run.Append([], "a", baseline: true);
        await run.Append(["turn", "phase"], "guest");
        await run.Append([]);
        await run.Rewind(2);
        await run.Append([]);
        await using var cleanerDb = fixture.CreateDbContext();
        await new GameHistoryCleanup(cleanerDb, NullLogger<GameHistoryCleanup>.Instance).Run(CancellationToken.None);

        await run.Rewind(4);
        await run.Append([]);

        var summary = Assert.IsType<HistorySummary>(await run.History.GetHistorySummary(run.GameId, 7));
        Assert.Equal(1, summary.BarrierVersion);
        Assert.Equal(6, summary.Checkpoints["turn"]);
        Assert.Equal(6, summary.Checkpoints["phase"]);
        Assert.Equal(new HistoryAction(2, "guest"), summary.LastAction);
        Assert.Contains(new HistoryTarget("undo", 1), summary.GetTargets());
        Assert.Equal(3, run.Current.State.Counter);
    }

    private static void AssertSummary(HistorySummary expected, HistorySummary actual)
    {
        Assert.Equal(expected.GameVersion, actual.GameVersion);
        Assert.Equal(expected.BarrierVersion, actual.BarrierVersion);
        Assert.Equal(expected.LastAction, actual.LastAction);
        Assert.Equal(expected.Checkpoints.Count, actual.Checkpoints.Count);
        foreach (var (id, version) in expected.Checkpoints)
            Assert.Equal(version, actual.Checkpoints[id]);
    }

    private async Task<HistoryRun> Begin()
    {
        var gameId = await HistoryTestData.SeedGame(fixture);
        var db = fixture.CreateDbContext();
        var history = new GameHistory<TestState>(db, NullLogger<GameHistory<TestState>>.Instance);
        var stored = Assert.IsType<StoredState<TestState>>(await history.Begin(gameId, new TestState(0)));
        return new HistoryRun(db, history, gameId, stored);
    }

    private sealed record TestState(int Counter) : ISchemaVersioned
    {
        public int SchemaVersion => 1;
    }

    private sealed class HistoryRun(
        ApplicationDbContext db,
        GameHistory<TestState> history,
        Guid gameId,
        StoredState<TestState> stored
    ) : IAsyncDisposable
    {
        public Guid GameId { get; } = gameId;
        public GameHistory<TestState> History { get; } = history;
        public StoredState<TestState> Current { get; private set; } = stored;

        public async Task Append(
            IReadOnlyList<string> checkpoints,
            string? actor = null,
            bool irreversible = false,
            bool baseline = false
        )
        {
            Current = Assert.IsType<StoredState<TestState>>(
                await History.Append(
                    GameId,
                    Current,
                    new StepResult<TestState>(
                        new TestState(Current.State.Counter + 1),
                        checkpoints,
                        irreversible,
                        baseline
                    ),
                    actor is null ? null : new PlayerChoice(actor, "action")
                )
            );
        }

        public async Task Rewind(int destinationVersion) =>
            Current = Assert.IsType<StoredState<TestState>>(await History.Rewind(GameId, Current, destinationVersion));

        public ValueTask DisposeAsync() => db.DisposeAsync();
    }
}
