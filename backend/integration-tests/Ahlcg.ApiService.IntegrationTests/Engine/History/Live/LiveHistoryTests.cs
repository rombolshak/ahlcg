using System.Text.Json;
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
        Assert.Null(await run.History.Rewind(run.GameId, 7, 4));
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
        Assert.Null(await run.History.LoadAt(run.GameId, 4, CancellationToken.None));
        Assert.Null(await run.History.Rewind(run.GameId, 6, 2));
        var actors = Assert.IsAssignableFrom<IReadOnlySet<string>>(
            await run.History.GetActorsForRange(run.GameId, 0, 6)
        );
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

        Assert.True(Assert.IsAssignableFrom<IReadOnlySet<string>>(all).SetEquals(["a", "b"]));
        Assert.True(Assert.IsAssignableFrom<IReadOnlySet<string>>(afterAbandoned).SetEquals(["a", "b"]));
        Assert.Empty(Assert.IsAssignableFrom<IReadOnlySet<string>>(equal));
        Assert.Null(await run.History.GetActorsForRange(run.GameId, -1, 5));
        Assert.Null(await run.History.GetActorsForRange(run.GameId, 5, 4));
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

        var summary = await run.History.GetHistorySummary(run.GameId, 2);

        Assert.Null(summary);
        Assert.Null(await run.History.GetActorsForRange(run.GameId, 0, 2));
        Assert.Null(await run.History.Rewind(run.GameId, 2, 1));
        if (exactSnapshot)
            Assert.NotNull(await run.History.LoadAt(run.GameId, 2, CancellationToken.None));
        else
            Assert.Null(await run.History.LoadAt(run.GameId, 2, CancellationToken.None));
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
        Assert.Empty(
            Assert.IsAssignableFrom<IReadOnlySet<string>>(await run.History.GetActorsForRange(run.GameId, 0, 0))
        );
        Assert.Null(await run.History.GetHistorySummary(run.GameId, 1));
        Assert.Null(await run.History.GetHistorySummary(Guid.NewGuid(), 0));
    }

    [Fact]
    public async Task GetActorsForRange_ActorlessHistory_ReturnsEmptyUntilAnchorBecomesUnreconstructible()
    {
        var run = await Begin();
        await run.Append(1);

        var actors = await run.History.GetActorsForRange(run.GameId, 0, 1);

        Assert.Empty(Assert.IsAssignableFrom<IReadOnlySet<string>>(actors));
        await using var db = fixture.CreateDbContext();
        await db.GameSnapshots.Where(s => s.GameId == run.GameId).ExecuteDeleteAsync();
        Assert.Null(await run.History.GetHistorySummary(run.GameId, 1));
        Assert.Null(await run.History.GetActorsForRange(run.GameId, 0, 1));
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

        var summary = await run.History.GetHistorySummary(run.GameId, 3);

        Assert.Null(summary);
        Assert.NotNull(await run.History.LoadAt(run.GameId, 3, CancellationToken.None));
        Assert.Null(await run.History.Rewind(run.GameId, 3, 2));
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
        Assert.Null(await run.History.GetHistorySummary(run.GameId, 5));
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
            run.History.Rewind(run.GameId, 3, 1),
            competingRewind
                ? second.Rewind(run.GameId, 3, 2)
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
        Assert.Null(await second.Rewind(run.GameId, 3, 2));
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

        Assert.Null(await run.History.Rewind(run.GameId, 3, targetVersion));
    }

    private GameHistory<TestState> CreateHistory() =>
        new(fixture.CreateDbContext(), NullLogger<GameHistory<TestState>>.Instance);

    private GameHistoryCleanup CreateCleanup() =>
        new(fixture.CreateDbContext(), NullLogger<GameHistoryCleanup>.Instance);

    private async Task<Run> Begin(CancellationToken ct = default)
    {
        await using var db = fixture.CreateDbContext();
        var user = new AppUser { Id = Guid.NewGuid().ToString(), IsAnonymous = true };
        var game = new Game
        {
            OwnerId = user.Id,
            IdempotencyKey = Guid.NewGuid().ToString(),
            Configuration = JsonDocument.Parse("{}"),
            CreatedAt = DateTimeOffset.UtcNow,
            LastPlayedAt = DateTimeOffset.UtcNow,
        };
        db.Users.Add(user);
        db.Games.Add(game);
        await db.SaveChangesAsync(ct);
        var history = CreateHistory();
        Assert.NotNull(await history.Begin(game.Id, CreateState(0), ct));
        return new Run(game.Id, history);
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
