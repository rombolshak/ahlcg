using System.Globalization;
using Ahlcg.ApiService.IntegrationTests.Fixture;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Logging.Testing;
using Tablier.Contract;
using Tablier.Data;
using Tablier.Engine.History;
using Tablier.Engine.History.Cleanup;

namespace Ahlcg.ApiService.IntegrationTests.Engine.History;

[Collection(AppCollection.Name)]
public class GameHistoryCleanupTests(AppFixture fixture)
{
    [Fact]
    public async Task Restore_CheckpointsRemainReachableAfterCleanup()
    {
        var run = await BeginGame();
        await run.Append(CreateStep(1, checkpoint: "a"));
        await run.Append(CreateStep(2, checkpoint: "b"));
        await run.Append(CreateStep(3));
        var first = await run.History.Restore(run.GameId, run.Current, 2, CancellationToken.None);
        var cleanup = new GameHistoryCleanup(fixture.CreateDbContext(), NullLogger<GameHistoryCleanup>.Instance);
        await cleanup.Run(CancellationToken.None);
        var second = await run.History.Restore(run.GameId, first!, 1, CancellationToken.None);
        await cleanup.Run(CancellationToken.None);

        Assert.Equal(new StoredState<TestState>(5, CreateState(1)), second);
        Assert.Equal(
            new StoredState<TestState>(1, CreateState(1)),
            await run.History.LoadAt(run.GameId, 1, CancellationToken.None)
        );
        await using var db = fixture.CreateDbContext();
        var steps = await db
            .GameSteps.AsNoTracking()
            .Where(s => s.GameId == run.GameId && s.RestoredVersion != null)
            .OrderBy(s => s.Version)
            .ToListAsync();
        Assert.Equal([2, 1], steps.Select(s => s.RestoredVersion));
        Assert.Equal(["b", "a"], steps.Select(s => s.Checkpoint));
        Assert.All(steps, s =>
        {
            Assert.False(s.IsIrreversible);
            Assert.False(s.IsBaseline);
        });
        Assert.Equal(second, await run.History.LoadCurrent(run.GameId, CancellationToken.None));
    }

    [Fact]
    public async Task LoadAt_AfterIrreversibleSnapshotAndCleanup_ReconstructsFollowingStep()
    {
        var run = await BeginGame();
        await run.Append(CreateStep(1, checkpoint: "a"));
        await run.Append(CreateStep(2, irreversible: true));
        await run.Append(CreateStep(3));
        await run.Append(CreateStep(4, checkpoint: "b"));
        await new GameHistoryCleanup(fixture.CreateDbContext(), NullLogger<GameHistoryCleanup>.Instance).Run(
            CancellationToken.None
        );
        Assert.Equal(
            new StoredState<TestState>(3, CreateState(3)),
            await run.History.LoadAt(run.GameId, 3, CancellationToken.None)
        );
        Assert.Null(await run.History.LoadAt(run.GameId, 1, CancellationToken.None));
    }

    [Fact]
    public async Task Run_BaselineThenCheckpointsThenIrreversibleWithoutCheckpoint_KeepsBaselineAndNewestSnapshots()
    {
        var game = await PlayBaselineThenCheckpointsThenIrreversible(await BeginGame());

        var result = await CreateCleanup().Run(CancellationToken.None);

        Assert.NotNull(result);
        Assert.Equal([3, 4, 5, 6, 7], await game.GetStepVersions());
        Assert.Equal([3, 6], await game.GetSnapshotVersions());
    }

    [Fact]
    public async Task Run_BaselineThenIrreversibleWithCheckpoint_KeepsBaselineAndIrreversibleSnapshots()
    {
        var game = await PlayBaselineThenIrreversibleWithCheckpoint(await BeginGame());

        await CreateCleanup().Run(CancellationToken.None);

        Assert.Equal([2, 3, 4, 5, 6], await game.GetStepVersions());
        Assert.Equal([2, 5], await game.GetSnapshotVersions());
    }

    [Fact]
    public async Task Run_IrreversibleBeforeBaseline_KeepsOnlyBaselineSnapshot()
    {
        var game = await PlayIrreversibleThenBaseline(await BeginGame());

        await CreateCleanup().Run(CancellationToken.None);

        Assert.Equal([5, 6], await game.GetStepVersions());
        Assert.Equal([5], await game.GetSnapshotVersions());
    }

    [Fact]
    public async Task Run_NoBaselineAndNoIrreversible_DeletesNothing()
    {
        var game = await BeginGame();
        await game.Append(CreateStep(1));
        await game.Append(CreateStep(2, checkpoint: "a"));
        await game.Append(CreateStep(3));

        await CreateCleanup().Run(CancellationToken.None);

        Assert.Equal([1, 2, 3], await game.GetStepVersions());
        Assert.Equal([0, 2], await game.GetSnapshotVersions());
    }

    [Theory]
    [InlineData(1)]
    [InlineData(2)]
    [InlineData(3)]
    public async Task Run_AnyOrdering_LeavesEveryLoadUnchanged(int ordering)
    {
        var game = ordering switch
        {
            1 => await PlayBaselineThenCheckpointsThenIrreversible(await BeginGame()),
            2 => await PlayBaselineThenIrreversibleWithCheckpoint(await BeginGame()),
            _ => await PlayIrreversibleThenBaseline(await BeginGame()),
        };
        var before = await game.LoadEverything();

        await CreateCleanup().Run(CancellationToken.None);

        Assert.Equal(before, await game.LoadEverything());
    }

    [Fact]
    public async Task Run_AnotherRunHoldsTheLock_SkipsAndDeletesNothing()
    {
        var game = await PlayBaselineThenCheckpointsThenIrreversible(await BeginGame());
        var logger = new FakeLogger<GameHistoryCleanup>();
        await using var holder = fixture.CreateDbContext();
        await using var transaction = await holder.Database.BeginTransactionAsync();
        var held = await holder
            .Database.SqlQuery<bool>($"""SELECT pg_try_advisory_xact_lock({GameHistoryCleanup.LockKey}) AS "Value" """)
            .ToListAsync();
        Assert.Equal([true], held);

        var result = await CreateCleanup(logger).Run(CancellationToken.None);

        Assert.Null(result);
        Assert.Equal("LogCleanupSkippedLockHeld", logger.LatestRecord.Id.Name);
        Assert.Equal([1, 2, 3, 4, 5, 6, 7], await game.GetStepVersions());
        Assert.Equal([0, 3, 4, 5, 6], await game.GetSnapshotVersions());
    }

    [Fact]
    public async Task Run_WhileStepsAreAppended_KeepsEveryStepAboveTheLatestBaseline()
    {
        var game = await BeginGame();
        const int steps = 40;
        using var done = new CancellationTokenSource();

        var cleaners = Enumerable
            .Range(0, 3)
            .Select(_ =>
                Task.Run(async () =>
                {
                    var cleanup = CreateCleanup();
                    while (!done.IsCancellationRequested)
                        await cleanup.Run(CancellationToken.None);
                })
            )
            .ToList();
        var latestBaseline = 0;
        for (var n = 1; n <= steps; n++)
        {
            var isBaseline = n % 7 == 0;
            await game.Append(CreateStep(n, checkpoint: n % 5 == 0 ? "c" : null, baseline: isBaseline));
            if (isBaseline)
                latestBaseline = n;
        }

        await done.CancelAsync();
        await Task.WhenAll(cleaners);
        await CreateCleanup().Run(CancellationToken.None);

        Assert.Equal(Enumerable.Range(latestBaseline, steps - latestBaseline + 1), await game.GetStepVersions());
        var history = new GameHistory<TestState>(
            fixture.CreateDbContext(),
            NullLogger<GameHistory<TestState>>.Instance
        );
        Assert.Equal(
            new StoredState<TestState>(steps, CreateState(steps)),
            await history.LoadCurrent(game.GameId, CancellationToken.None)
        );
    }

    private sealed record TestState(int Counter, string Label, bool Flag) : ISchemaVersioned
    {
        public int SchemaVersion => 1;
    }

    private static TestState CreateState(int n) =>
        new(n, string.Create(CultureInfo.InvariantCulture, $"state {n}"), n % 2 == 0);

    private static StepResult<TestState> CreateStep(
        int n,
        string? checkpoint = null,
        bool irreversible = false,
        bool baseline = false
    ) => new(CreateState(n), checkpoint, irreversible, baseline);

    private sealed class HistoryTestContext(GameHistory<TestState> history, Guid gameId, ApplicationDbContext reader)
    {
        public Guid GameId { get; } = gameId;
        public GameHistory<TestState> History { get; } = history;
        public StoredState<TestState> Current { get; private set; } = new(0, CreateState(0));

        public async Task Append(StepResult<TestState> step)
        {
            var appended = await History.Append(GameId, Current, step, choice: null, CancellationToken.None);
            Current = Assert.IsType<StoredState<TestState>>(appended);
        }

        public async Task<List<StoredState<TestState>?>> LoadEverything()
        {
            var loaded = new List<StoredState<TestState>?>
            {
                await History.LoadCurrent(GameId, CancellationToken.None),
            };
            for (var v = 0; v <= Current.Version; v++)
                loaded.Add(await History.LoadAt(GameId, v, CancellationToken.None));
            return loaded;
        }

        public Task<List<int>> GetStepVersions() =>
            reader
                .GameSteps.AsNoTracking()
                .Where(s => s.GameId == GameId)
                .OrderBy(s => s.Version)
                .Select(s => s.Version)
                .ToListAsync();

        public Task<List<int>> GetSnapshotVersions() =>
            reader
                .GameSnapshots.AsNoTracking()
                .Where(s => s.GameId == GameId)
                .OrderBy(s => s.Version)
                .Select(s => s.Version)
                .ToListAsync();
    }

    private GameHistoryCleanup CreateCleanup(FakeLogger<GameHistoryCleanup>? logger = null) =>
        new(fixture.CreateDbContext(), logger ?? new FakeLogger<GameHistoryCleanup>());

    private async Task<HistoryTestContext> BeginGame()
    {
        var gameId = await HistoryTestData.SeedGame(fixture);
        var history = new GameHistory<TestState>(
            fixture.CreateDbContext(),
            NullLogger<GameHistory<TestState>>.Instance
        );
        var begun = await history.Begin(gameId, CreateState(0), CancellationToken.None);
        Assert.Equal(new StoredState<TestState>(0, CreateState(0)), begun);
        return new HistoryTestContext(history, gameId, fixture.CreateDbContext());
    }

    private static async Task<HistoryTestContext> PlayBaselineThenCheckpointsThenIrreversible(HistoryTestContext game)
    {
        await game.Append(CreateStep(1));
        await game.Append(CreateStep(2));
        await game.Append(CreateStep(3, baseline: true));
        await game.Append(CreateStep(4, checkpoint: "a"));
        await game.Append(CreateStep(5, checkpoint: "b"));
        await game.Append(CreateStep(6, irreversible: true));
        await game.Append(CreateStep(7));
        return game;
    }

    private static async Task<HistoryTestContext> PlayBaselineThenIrreversibleWithCheckpoint(HistoryTestContext game)
    {
        await game.Append(CreateStep(1));
        await game.Append(CreateStep(2, baseline: true));
        await game.Append(CreateStep(3, checkpoint: "a"));
        await game.Append(CreateStep(4));
        await game.Append(CreateStep(5, checkpoint: "b", irreversible: true));
        await game.Append(CreateStep(6));
        return game;
    }

    private static async Task<HistoryTestContext> PlayIrreversibleThenBaseline(HistoryTestContext game)
    {
        await game.Append(CreateStep(1));
        await game.Append(CreateStep(2, checkpoint: "a", irreversible: true));
        await game.Append(CreateStep(3, checkpoint: "b"));
        await game.Append(CreateStep(4));
        await game.Append(CreateStep(5, baseline: true));
        await game.Append(CreateStep(6));
        return game;
    }
}
