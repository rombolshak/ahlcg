using System.Globalization;
using System.Text.Json;
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
    private sealed record TestState(int Counter, string Label, bool Flag) : ISchemaVersioned
    {
        public int SchemaVersion => 1;
    }

    private static TestState State(int n) =>
        new(n, string.Create(CultureInfo.InvariantCulture, $"state {n}"), n % 2 == 0);

    private static StepResult<TestState> Step(
        int n,
        string? checkpoint = null,
        bool irreversible = false,
        bool baseline = false
    ) => new(State(n), checkpoint, irreversible, baseline);

    private sealed class Played(GameHistory<TestState> history, Guid gameId, ApplicationDbContext reader)
    {
        public Guid GameId { get; } = gameId;
        public StoredState<TestState> Current { get; private set; } = new(0, State(0));

        public async Task AppendAsync(StepResult<TestState> step)
        {
            var appended = await history.Append(GameId, Current, step, choice: null, CancellationToken.None);
            Current = Assert.IsType<StoredState<TestState>>(appended);
        }

        public async Task<List<StoredState<TestState>?>> LoadEverythingAsync()
        {
            var loaded = new List<StoredState<TestState>?>
            {
                await history.LoadCurrent(GameId, CancellationToken.None),
            };
            for (var v = 0; v <= Current.Version; v++)
                loaded.Add(await history.LoadAt(GameId, v, CancellationToken.None));
            return loaded;
        }

        public Task<List<int>> StepVersionsAsync() =>
            reader
                .GameSteps.AsNoTracking()
                .Where(s => s.GameId == GameId)
                .OrderBy(s => s.Version)
                .Select(s => s.Version)
                .ToListAsync();

        public Task<List<int>> SnapshotVersionsAsync() =>
            reader
                .GameSnapshots.AsNoTracking()
                .Where(s => s.GameId == GameId)
                .OrderBy(s => s.Version)
                .Select(s => s.Version)
                .ToListAsync();
    }

    private GameHistoryCleanup NewCleanup(FakeLogger<GameHistoryCleanup>? logger = null) =>
        new(fixture.CreateDbContext(), logger ?? new FakeLogger<GameHistoryCleanup>());

    private async Task<Played> BeginGameAsync()
    {
        var gameId = await SeedGameAsync();
        var history = new GameHistory<TestState>(
            fixture.CreateDbContext(),
            NullLogger<GameHistory<TestState>>.Instance
        );
        var begun = await history.Begin(gameId, State(0), CancellationToken.None);
        Assert.Equal(new StoredState<TestState>(0, State(0)), begun);
        return new Played(history, gameId, fixture.CreateDbContext());
    }

    private async Task<Guid> SeedGameAsync()
    {
        var now = DateTimeOffset.UtcNow;
        var user = new AppUser
        {
            Id = Guid.NewGuid().ToString(),
            UserName = Guid.NewGuid().ToString(),
            IsAnonymous = true,
        };
        var game = new Tablier.Data.Game
        {
            OwnerId = user.Id,
            IdempotencyKey = Guid.NewGuid().ToString(),
            Configuration = JsonDocument.Parse("{}"),
            CreatedAt = now,
            LastPlayedAt = now,
        };

        await using var db = fixture.CreateDbContext();
        db.Users.Add(user);
        db.Games.Add(game);
        await db.SaveChangesAsync();
        return game.Id;
    }

    private static async Task<Played> BaselineThenCheckpointsThenIrreversibleAsync(Played game)
    {
        await game.AppendAsync(Step(1));
        await game.AppendAsync(Step(2));
        await game.AppendAsync(Step(3, baseline: true));
        await game.AppendAsync(Step(4, checkpoint: "a"));
        await game.AppendAsync(Step(5, checkpoint: "b"));
        await game.AppendAsync(Step(6, irreversible: true));
        await game.AppendAsync(Step(7));
        return game;
    }

    private static async Task<Played> BaselineThenIrreversibleWithCheckpointAsync(Played game)
    {
        await game.AppendAsync(Step(1));
        await game.AppendAsync(Step(2, baseline: true));
        await game.AppendAsync(Step(3, checkpoint: "a"));
        await game.AppendAsync(Step(4));
        await game.AppendAsync(Step(5, checkpoint: "b", irreversible: true));
        await game.AppendAsync(Step(6));
        return game;
    }

    private static async Task<Played> IrreversibleThenBaselineAsync(Played game)
    {
        await game.AppendAsync(Step(1));
        await game.AppendAsync(Step(2, checkpoint: "a", irreversible: true));
        await game.AppendAsync(Step(3, checkpoint: "b"));
        await game.AppendAsync(Step(4));
        await game.AppendAsync(Step(5, baseline: true));
        await game.AppendAsync(Step(6));
        return game;
    }

    [Fact]
    public async Task Run_BaselineThenCheckpointsThenIrreversibleWithoutCheckpoint_KeepsBaselineAndNewestSnapshots()
    {
        var game = await BaselineThenCheckpointsThenIrreversibleAsync(await BeginGameAsync());

        var result = await NewCleanup().Run(CancellationToken.None);

        Assert.NotNull(result);
        Assert.Equal([3, 4, 5, 6, 7], await game.StepVersionsAsync());
        Assert.Equal([3, 5], await game.SnapshotVersionsAsync());
    }

    [Fact]
    public async Task Run_BaselineThenIrreversibleWithCheckpoint_KeepsBaselineAndIrreversibleSnapshots()
    {
        var game = await BaselineThenIrreversibleWithCheckpointAsync(await BeginGameAsync());

        await NewCleanup().Run(CancellationToken.None);

        Assert.Equal([2, 3, 4, 5, 6], await game.StepVersionsAsync());
        Assert.Equal([2, 5], await game.SnapshotVersionsAsync());
    }

    [Fact]
    public async Task Run_IrreversibleBeforeBaseline_KeepsOnlyBaselineSnapshot()
    {
        var game = await IrreversibleThenBaselineAsync(await BeginGameAsync());

        await NewCleanup().Run(CancellationToken.None);

        Assert.Equal([5, 6], await game.StepVersionsAsync());
        Assert.Equal([5], await game.SnapshotVersionsAsync());
    }

    [Fact]
    public async Task Run_NoBaselineAndNoIrreversible_DeletesNothing()
    {
        var game = await BeginGameAsync();
        await game.AppendAsync(Step(1));
        await game.AppendAsync(Step(2, checkpoint: "a"));
        await game.AppendAsync(Step(3));

        await NewCleanup().Run(CancellationToken.None);

        Assert.Equal([1, 2, 3], await game.StepVersionsAsync());
        Assert.Equal([0, 2], await game.SnapshotVersionsAsync());
    }

    [Theory]
    [InlineData(1)]
    [InlineData(2)]
    [InlineData(3)]
    public async Task Run_AnyOrdering_LeavesEveryLoadUnchanged(int ordering)
    {
        var game = ordering switch
        {
            1 => await BaselineThenCheckpointsThenIrreversibleAsync(await BeginGameAsync()),
            2 => await BaselineThenIrreversibleWithCheckpointAsync(await BeginGameAsync()),
            _ => await IrreversibleThenBaselineAsync(await BeginGameAsync()),
        };
        var before = await game.LoadEverythingAsync();

        await NewCleanup().Run(CancellationToken.None);

        Assert.Equal(before, await game.LoadEverythingAsync());
    }

    [Fact]
    public async Task Run_AnotherRunHoldsTheLock_SkipsAndDeletesNothing()
    {
        var game = await BaselineThenCheckpointsThenIrreversibleAsync(await BeginGameAsync());
        var logger = new FakeLogger<GameHistoryCleanup>();
        await using var holder = fixture.CreateDbContext();
        await using var transaction = await holder.Database.BeginTransactionAsync();
        var held = await holder
            .Database.SqlQuery<bool>($"""SELECT pg_try_advisory_xact_lock({GameHistoryCleanup.LockKey}) AS "Value" """)
            .ToListAsync();
        Assert.Equal([true], held);

        var result = await NewCleanup(logger).Run(CancellationToken.None);

        Assert.Null(result);
        Assert.Equal("LogCleanupSkippedLockHeld", logger.LatestRecord.Id.Name);
        Assert.Equal([1, 2, 3, 4, 5, 6, 7], await game.StepVersionsAsync());
        Assert.Equal([0, 3, 4, 5], await game.SnapshotVersionsAsync());
    }

    [Fact]
    public async Task Run_WhileStepsAreAppended_KeepsEveryStepAboveTheLatestBaseline()
    {
        var game = await BeginGameAsync();
        const int steps = 40;
        using var done = new CancellationTokenSource();

        var cleaners = Enumerable
            .Range(0, 3)
            .Select(_ =>
                Task.Run(async () =>
                {
                    var cleanup = NewCleanup();
                    while (!done.IsCancellationRequested)
                        await cleanup.Run(CancellationToken.None);
                })
            )
            .ToList();
        var latestBaseline = 0;
        for (var n = 1; n <= steps; n++)
        {
            var isBaseline = n % 7 == 0;
            await game.AppendAsync(Step(n, checkpoint: n % 5 == 0 ? "c" : null, baseline: isBaseline));
            if (isBaseline)
                latestBaseline = n;
        }

        await done.CancelAsync();
        await Task.WhenAll(cleaners);
        await NewCleanup().Run(CancellationToken.None);

        Assert.Equal(Enumerable.Range(latestBaseline, steps - latestBaseline + 1), await game.StepVersionsAsync());
        var history = new GameHistory<TestState>(
            fixture.CreateDbContext(),
            NullLogger<GameHistory<TestState>>.Instance
        );
        Assert.Equal(
            new StoredState<TestState>(steps, State(steps)),
            await history.LoadCurrent(game.GameId, CancellationToken.None)
        );
    }
}
