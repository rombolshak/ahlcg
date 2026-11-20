using System.Text.Json;
using Ahlcg.ApiService.IntegrationTests.Engine.History.Helpers;
using Ahlcg.ApiService.IntegrationTests.Fixture;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using Tablier.Contract;
using Tablier.Data;
using Tablier.Engine.History;
using Tablier.Engine.History.Cleanup;
using Tablier.Engine.History.Live;

namespace Ahlcg.ApiService.IntegrationTests.Engine.History.Live;

[Collection(AppCollection.Name)]
public class LiveHistoryTests(AppFixture fixture)
{
    private static readonly string[] LegacyCheckpoints = ["undo", "phase"];

    private sealed record TestState(int Counter, GameRandom Random, string[] Journal) : ISchemaVersioned
    {
        public int SchemaVersion => 1;
    }

    private sealed class Run(Guid gameId, GameHistory<TestState> history)
    {
        public Guid GameId { get; } = gameId;
        public GameHistory<TestState> History { get; } = history;
        public StoredState<TestState> Head { get; private set; } = new(0, CreateState(0));

        public async Task Append(
            int counter,
            string? actor = null,
            string[]? checkpoints = null,
            bool baseline = false,
            bool irreversible = false,
            CancellationToken ct = default
        ) =>
            Head = Assert.IsType<StoredState<TestState>>(
                await History.Append(
                    GameId,
                    Head,
                    new StepResult<TestState>(
                        CreateState(counter),
                        checkpoints ?? [],
                        IsIrreversible: irreversible,
                        IsBaseline: baseline
                    ),
                    choice: actor is null ? null : new PlayerChoice(actor, "move"),
                    ct
                )
            );

        public async Task Rewind(int targetVersion, CancellationToken ct = default) =>
            Head = Assert.IsType<StoredState<TestState>>(await History.Rewind(GameId, Head.Version, targetVersion, ct));

        public async Task<HistorySummary> GetSummary(CancellationToken ct = default) =>
            Assert.IsType<HistorySummary>(await History.GetHistorySummary(GameId, Head.Version, ct));
    }

    [Fact]
    public async Task Rewind_NestedDestination_RestoresExactStateAndOriginalMetadataThroughActorlessTail()
    {
        var run = await Begin();
        await run.Append(1);
        await run.Append(2, actor: "a", checkpoints: ["turn", "phase"]);
        var destination = run.Head.State;
        await run.Append(3, actor: "b");
        await run.Rewind(2);
        await run.Append(5, actor: "c");

        await run.Rewind(4);
        await run.Append(7);

        await using var db = fixture.CreateDbContext();
        var rewind = await db.GameSteps.AsNoTracking().SingleAsync(s => s.GameId == run.GameId && s.Version == 6);
        Assert.Equal(2, rewind.RestoredVersion);
        Assert.Equal("a", rewind.Actor);
        Assert.Equal("move", rewind.Action);
        Assert.Equal(["turn", "phase"], rewind.Checkpoints);
        AssertState(
            destination,
            Assert.IsType<StoredState<TestState>>(await run.History.LoadAt(run.GameId, 6, CancellationToken.None)).State
        );
        AssertState(
            CreateState(5),
            Assert.IsType<StoredState<TestState>>(await run.History.LoadAt(run.GameId, 5, CancellationToken.None)).State
        );
        var summary = await run.GetSummary();
        Assert.Equal(new HistoryAction(6, 2, "a", "move"), summary.LastAction);
        Assert.Equal(1, summary.GetTargets()["undo"]);
        Assert.Equal(6, summary.GetTargets()["turn"]);
        await Assert.ThrowsAsync<InvalidOperationException>(() => run.History.Rewind(run.GameId, 7, 4));
        var versions = await db
            .GameSteps.Where(s => s.GameId == run.GameId)
            .OrderBy(s => s.Version)
            .Select(s => s.Version)
            .ToArrayAsync();
        Assert.Equal([1, 2, 3, 4, 5, 6, 7], versions);
    }

    [Theory]
    [InlineData(true, false, false)]
    [InlineData(true, false, true)]
    [InlineData(false, true, false)]
    [InlineData(false, true, true)]
    public async Task Rewind_CopiedBarrier_RemainsEligibleBeforeAndAfterCleanup(
        bool baseline,
        bool irreversible,
        bool clean
    )
    {
        var run = await Begin();
        await run.Append(1);
        await run.Append(2, actor: "a", checkpoints: ["barrier"], baseline: baseline, irreversible: irreversible);
        await run.Append(3, actor: "b");
        await run.Rewind(2);
        await run.Append(5);
        if (clean)
            await CreateCleanup().Run(CancellationToken.None);

        await run.Rewind(4);

        await using var db = fixture.CreateDbContext();
        var copied = await db.GameSteps.AsNoTracking().SingleAsync(s => s.GameId == run.GameId && s.Version == 6);
        Assert.Equal(2, copied.RestoredVersion);
        Assert.Equal(baseline, copied.IsBaseline);
        Assert.Equal(irreversible, copied.IsIrreversible);
        Assert.Equal("a", copied.Actor);
        Assert.True(await db.GameSnapshots.AnyAsync(s => s.GameId == run.GameId && s.Version == 6));
        AssertState(CreateState(2), run.Head.State);
        var summary = await run.GetSummary();
        Assert.Equal(6, summary.BarrierVersion);
        Assert.Empty(summary.GetTargets());
        await Assert.ThrowsAsync<InvalidOperationException>(() =>
            run.History.LoadAt(run.GameId, 4, CancellationToken.None)
        );
        await Assert.ThrowsAsync<InvalidOperationException>(() => run.History.Rewind(run.GameId, 6, 2));
        var actors = await run.History.GetActorsForRange(run.GameId, 0, 6);
        Assert.NotNull(actors);
        Assert.Equal("a", Assert.Single(actors));
        if (clean && baseline)
            Assert.False(await db.GameSteps.AnyAsync(s => s.GameId == run.GameId && s.Version == 2));
    }

    [Fact]
    public async Task GetActorsForRange_ReplacedRowsAndNumericCutoff_ReturnsOnlyNeutralLiveActors()
    {
        var run = await Begin();
        await run.Append(1, actor: "a");
        await run.Append(2, actor: "b");
        await run.Append(3, actor: "abandoned");
        await run.Rewind(2);
        await run.Append(5, actor: "a");

        var all = await run.History.GetActorsForRange(run.GameId, 0, 5);
        var afterAbandoned = await run.History.GetActorsForRange(run.GameId, 3, 5);
        var equal = await run.History.GetActorsForRange(run.GameId, 5, 5);

        Assert.NotNull(all);
        Assert.True(all.SetEquals(["a", "b"]));
        Assert.NotNull(afterAbandoned);
        Assert.True(afterAbandoned.SetEquals(["a", "b"]));
        Assert.NotNull(equal);
        Assert.Empty(equal);
        await Assert.ThrowsAsync<ArgumentOutOfRangeException>(() => run.History.GetActorsForRange(run.GameId, -1, 5));
        await Assert.ThrowsAsync<ArgumentOutOfRangeException>(() => run.History.GetActorsForRange(run.GameId, 5, 4));
    }

    [Fact]
    public async Task GetHistorySummary_LivePredecessorsBeforeLatestSnapshot_RemainAvailableForFactsAndRewind()
    {
        var run = await Begin();
        await run.Append(1, actor: "early", checkpoints: ["early"]);
        await run.Append(2, actor: "latest");
        await run.Append(3, checkpoints: ["saved"]);
        await run.Append(4);

        var summary = await run.GetSummary();

        Assert.Equal(1, summary.Checkpoints["early"]);
        Assert.Equal(3, summary.Checkpoints["saved"]);
        Assert.Equal(new HistoryAction(2, 2, "latest", "move"), summary.LastAction);
        Assert.True((await run.History.GetActorsForRange(run.GameId, 0, 4)).SetEquals(["early", "latest"]));
        await run.Rewind(1);
        AssertState(CreateState(1), run.Head.State);
        Assert.Equal(new HistoryAction(5, 1, "early", "move"), (await run.GetSummary()).LastAction);
    }

    [Theory]
    [InlineData(false)]
    [InlineData(true)]
    public async Task GetHistorySummary_SnapshotBeforeBarrier_RequiresPhysicalCoverageBelowBarrier(bool removePatch)
    {
        var run = await Begin();
        await run.Append(1);
        await run.Append(2, irreversible: true);
        await run.Append(3);
        await using var db = fixture.CreateDbContext();
        await db.GameSnapshots.Where(s => s.GameId == run.GameId && s.Version == 2).ExecuteDeleteAsync();
        if (removePatch)
            await db.GameSteps.Where(s => s.GameId == run.GameId && s.Version == 1).ExecuteDeleteAsync();

        if (removePatch)
        {
            await Assert.ThrowsAsync<InvalidOperationException>(() => run.History.GetHistorySummary(run.GameId, 3));
            await Assert.ThrowsAsync<InvalidOperationException>(() => run.History.GetActorsForRange(run.GameId, 0, 3));
            await Assert.ThrowsAsync<InvalidOperationException>(() => run.History.Rewind(run.GameId, 3, 2));
        }
        else
        {
            Assert.Equal(2, (await run.GetSummary()).BarrierVersion);
            Assert.Empty(await run.History.GetActorsForRange(run.GameId, 0, 3));
            await run.Rewind(2);
            AssertState(CreateState(2), run.Head.State);
        }
    }

    [Theory]
    [InlineData(false)]
    [InlineData(true)]
    public async Task GetHistorySummary_MissingPhysicalPatchOrLivePredecessor_IsRefused(bool exactSnapshot)
    {
        var run = await Begin();
        await run.Append(1);
        await run.Append(2, checkpoints: exactSnapshot ? ["saved"] : []);
        await using var db = fixture.CreateDbContext();
        await db.GameSteps.Where(s => s.GameId == run.GameId && s.Version == 1).ExecuteDeleteAsync();

        await Assert.ThrowsAsync<InvalidOperationException>(() => run.History.GetHistorySummary(run.GameId, 2));

        await Assert.ThrowsAsync<InvalidOperationException>(() => run.History.GetActorsForRange(run.GameId, 0, 2));
        await Assert.ThrowsAsync<InvalidOperationException>(() => run.History.Rewind(run.GameId, 2, 1));
        if (exactSnapshot)
            Assert.NotNull(await run.History.LoadAt(run.GameId, 2, CancellationToken.None));
        else
            await Assert.ThrowsAsync<InvalidOperationException>(() =>
                run.History.LoadAt(run.GameId, 2, CancellationToken.None)
            );
    }

    [Fact]
    public async Task GetHistorySummary_VersionZeroSnapshot_ReturnsEmptySummaryAndActorRange()
    {
        var run = await Begin();

        var summary = await run.GetSummary();

        Assert.Equal(0, summary.GameVersion);
        Assert.Equal(0, summary.BarrierVersion);
        Assert.Empty(summary.Checkpoints);
        Assert.Null(summary.LastAction);
        var actors = await run.History.GetActorsForRange(run.GameId, 0, 0);
        Assert.NotNull(actors);
        Assert.Empty(actors);
        await Assert.ThrowsAsync<ArgumentOutOfRangeException>(() => run.History.GetHistorySummary(run.GameId, 1));
        await Assert.ThrowsAsync<InvalidOperationException>(() => run.History.GetHistorySummary(Guid.NewGuid(), 0));
    }

    [Theory]
    [InlineData(0)]
    [InlineData(2)]
    public async Task GetHistorySummary_ReachableVersionZeroStep_IsRefused(int version)
    {
        var run = await Begin();
        if (version > 0)
        {
            await run.Append(1);
            await run.Append(2);
        }
        await using var db = fixture.CreateDbContext();
        db.GameSteps.Add(
            new GameStep
            {
                GameId = run.GameId,
                Version = 0,
                Patch = JsonDocument.Parse("[]"),
            }
        );
        await db.SaveChangesAsync();

        await Assert.ThrowsAsync<InvalidOperationException>(() => run.History.GetHistorySummary(run.GameId, version));

        await Assert.ThrowsAsync<InvalidOperationException>(() =>
            run.History.GetActorsForRange(run.GameId, 0, version)
        );
        AssertState(CreateState(version), (await run.History.LoadAt(run.GameId, version)).State);
        if (version > 0)
            await Assert.ThrowsAsync<InvalidOperationException>(() => run.History.Rewind(run.GameId, version, 1));
    }

    [Fact]
    public async Task GetActorsForRange_ActorlessHistory_ReturnsEmptyUntilAnchorBecomesUnreconstructible()
    {
        var run = await Begin();
        await run.Append(1);

        var actors = await run.History.GetActorsForRange(run.GameId, 0, 1);

        Assert.NotNull(actors);
        Assert.Empty(actors);
        await using var db = fixture.CreateDbContext();
        await db.GameSnapshots.Where(s => s.GameId == run.GameId).ExecuteDeleteAsync();
        await Assert.ThrowsAsync<InvalidOperationException>(() => run.History.GetHistorySummary(run.GameId, 1));
        await Assert.ThrowsAsync<InvalidOperationException>(() => run.History.GetActorsForRange(run.GameId, 0, 1));
    }

    [Theory]
    [InlineData(0)]
    [InlineData(1)]
    [InlineData(4)]
    public async Task GetHistorySummary_InvalidLiveLink_IsRefusedEvenWithExactPhysicalSnapshot(int restoredVersion)
    {
        var run = await Begin();
        await run.Append(1);
        await run.Append(2, baseline: true);
        await run.Append(3, checkpoints: ["saved"]);
        await using var db = fixture.CreateDbContext();
        await db
            .GameSteps.Where(s => s.GameId == run.GameId && s.Version == 3)
            .ExecuteUpdateAsync(setters => setters.SetProperty(s => s.RestoredVersion, restoredVersion));

        await Assert.ThrowsAsync<InvalidOperationException>(() => run.History.GetHistorySummary(run.GameId, 3));

        Assert.NotNull(await run.History.LoadAt(run.GameId, 3, CancellationToken.None));
        await Assert.ThrowsAsync<InvalidOperationException>(() => run.History.Rewind(run.GameId, 3, 2));
    }

    [Fact]
    public async Task Rewind_SkippedRowsNeededForPhysicalChain_SurviveCleanup()
    {
        var run = await Begin();
        await run.Append(1, baseline: true);
        await run.Append(2);
        await run.Append(3);
        await run.Append(4);
        await run.Rewind(2);

        await CreateCleanup().Run(CancellationToken.None);

        AssertState(
            CreateState(2),
            Assert.IsType<StoredState<TestState>>(await run.History.LoadAt(run.GameId, 5, CancellationToken.None)).State
        );
        await using var db = fixture.CreateDbContext();
        var versions = await db
            .GameSteps.Where(s => s.GameId == run.GameId)
            .OrderBy(s => s.Version)
            .Select(s => s.Version)
            .ToArrayAsync();
        Assert.Equal([1, 2, 3, 4, 5], versions);
        Assert.Equal(5, (await run.GetSummary()).GameVersion);
        await db.GameSteps.Where(s => s.GameId == run.GameId && s.Version == 3).ExecuteDeleteAsync();
        await Assert.ThrowsAsync<InvalidOperationException>(() => run.History.GetHistorySummary(run.GameId, 5));
    }

    [Theory]
    [InlineData(false)]
    [InlineData(true)]
    public async Task Rewind_CompetingAppendOrRewind_OnlyOneWriterCommitsAndStaleRetryIsRefused(bool competingRewind)
    {
        var run = await Begin();
        await run.Append(1);
        await run.Append(2);
        await run.Append(3);
        var second = CreateHistory();

        var writers = await Task.WhenAll(
            TryRewind(run.History, run.GameId, 3, 1),
            competingRewind
                ? TryRewind(second, run.GameId, 3, 2)
                : second.Append(
                    run.GameId,
                    run.Head,
                    new StepResult<TestState>(CreateState(4)),
                    choice: null,
                    CancellationToken.None
                )
        );

        Assert.Single(writers, state => state is not null);
        Assert.Equal(4, Assert.Single(writers, state => state is not null)!.Version);
        await Assert.ThrowsAsync<GameHistoryRewindConflictException>(() => second.Rewind(run.GameId, 3, 2));
        await using var db = fixture.CreateDbContext();
        Assert.Equal(4, await db.GameSteps.CountAsync(s => s.GameId == run.GameId));
    }

    [Fact]
    public async Task Rewind_LegacyReservedCheckpoint_CopiesRawMetadataWithoutOfferingConflictingTarget()
    {
        var run = await Begin();
        await run.Append(1);
        await run.Append(2, actor: "a", checkpoints: ["phase"]);
        await using var db = fixture.CreateDbContext();
        await db
            .GameSteps.Where(s => s.GameId == run.GameId && s.Version == 2)
            .ExecuteUpdateAsync(setters => setters.SetProperty(s => s.Checkpoints, LegacyCheckpoints));
        await run.Append(3);

        await run.Rewind(2);

        var row = await db.GameSteps.AsNoTracking().SingleAsync(s => s.GameId == run.GameId && s.Version == 4);
        Assert.Equal(["undo", "phase"], row.Checkpoints);
        var summary = await run.GetSummary();
        Assert.False(summary.Checkpoints.ContainsKey("undo"));
        Assert.Equal(1, summary.GetTargets()["undo"]);
    }

    [Theory]
    [InlineData(0)]
    [InlineData(-1)]
    [InlineData(3)]
    [InlineData(4)]
    public async Task Rewind_NonEarlierPositiveTarget_IsRefused(int targetVersion)
    {
        var run = await Begin();
        await run.Append(1);
        await run.Append(2);
        await run.Append(3);

        await Assert.ThrowsAsync<ArgumentOutOfRangeException>(() => run.History.Rewind(run.GameId, 3, targetVersion));
    }

    [Theory]
    [InlineData(-1)]
    [InlineData(int.MaxValue)]
    public async Task Rewind_HeadCannotBeIncremented_ThrowsArgumentOutOfRange(int expectedVersion)
    {
        var history = CreateHistory();

        var error = await Assert.ThrowsAsync<ArgumentOutOfRangeException>(() =>
            history.Rewind(Guid.NewGuid(), expectedVersion, 1)
        );

        Assert.Equal("expectedVersion", error.ParamName);
    }

    [Theory]
    [InlineData(-1)]
    [InlineData(1)]
    public async Task GetHistorySummary_VersionOutsideKnownHead_ThrowsArgumentOutOfRange(int version)
    {
        var run = await Begin();

        var error = await Assert.ThrowsAsync<ArgumentOutOfRangeException>(() =>
            run.History.GetHistorySummary(run.GameId, version)
        );

        Assert.Equal("version", error.ParamName);
    }

    [Theory]
    [InlineData(0, -1, "upperInclusiveVersion")]
    [InlineData(-1, 0, "lowerExclusiveVersion")]
    [InlineData(1, 0, "lowerExclusiveVersion")]
    [InlineData(0, 1, "upperInclusiveVersion")]
    public async Task GetActorsForRange_InvalidBounds_ThrowsForPublicParameter(int lower, int upper, string parameter)
    {
        var run = await Begin();

        var error = await Assert.ThrowsAsync<ArgumentOutOfRangeException>(() =>
            run.History.GetActorsForRange(run.GameId, lowerExclusiveVersion: lower, upperInclusiveVersion: upper)
        );

        Assert.Equal(parameter, error.ParamName);
    }

    [Fact]
    public async Task GetHistorySummary_MissingHeadStepWithExactSnapshot_ThrowsDespiteReconstructibleState()
    {
        var run = await Begin();
        await run.Append(1);
        await run.Append(2, checkpoints: ["saved"]);
        await using var db = fixture.CreateDbContext();
        await db.GameSteps.Where(s => s.GameId == run.GameId && s.Version == 2).ExecuteDeleteAsync();

        await Assert.ThrowsAsync<InvalidOperationException>(() => run.History.GetHistorySummary(run.GameId, 2));

        await Assert.ThrowsAsync<InvalidOperationException>(() => run.History.GetActorsForRange(run.GameId, 0, 2));
        await Assert.ThrowsAsync<InvalidOperationException>(() => run.History.Rewind(run.GameId, 2, 1));
        AssertState(CreateState(2), (await run.History.LoadAt(run.GameId, 2)).State);
    }

    [Fact]
    public async Task Rewind_UninitializedHistory_ThrowsInvariantExceptionWithoutOptimisticConflict()
    {
        var history = CreateHistory();

        var error = await Assert.ThrowsAsync<InvalidOperationException>(() => history.Rewind(Guid.NewGuid(), 2, 1));

        Assert.Contains("not_begun", error.Message, StringComparison.Ordinal);
    }

    private static async Task<StoredState<TestState>?> TryRewind(
        GameHistory<TestState> history,
        Guid gameId,
        int expectedVersion,
        int targetVersion,
        CancellationToken ct = default
    )
    {
        try
        {
            return await history.Rewind(gameId, expectedVersion, targetVersion, ct);
        }
        catch (GameHistoryRewindConflictException)
        {
            return null;
        }
    }

    private GameHistory<TestState> CreateHistory() => HistoryTestSetup.CreateHistory<TestState>(fixture);

    private GameHistoryCleanup CreateCleanup() =>
        new(fixture.CreateDbContext(), NullLogger<GameHistoryCleanup>.Instance);

    private async Task<Run> Begin(CancellationToken ct = default)
    {
        var gameId = await HistoryTestSetup.SeedGame(fixture, ct);
        var history = CreateHistory();
        Assert.NotNull(await history.Begin(gameId, CreateState(0), ct));
        return new Run(gameId, history);
    }

    private static TestState CreateState(int counter)
    {
        var random = GameRandom.FromSeed(782);
        for (var i = 0; i < counter; i++)
            (_, random) = random.Next(0, 100);

        return new TestState(
            counter,
            random,
            ["saved", counter.ToString(System.Globalization.CultureInfo.InvariantCulture)]
        );
    }

    private static void AssertState(TestState expected, TestState actual)
    {
        Assert.Equal(expected.Counter, actual.Counter);
        Assert.Equal(expected.Random, actual.Random);
        Assert.Equal(expected.Journal, actual.Journal);
    }
}
