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

    private static TestState CreateState(int n) =>
        new(n, string.Create(CultureInfo.InvariantCulture, $"state {n}"), n % 2 == 0);

    private static StepResult<TestState> CreateStep(
        int n,
        string? checkpoint = null,
        bool irreversible = false,
        bool baseline = false
    ) => new(CreateState(n), checkpoint, irreversible, baseline);

    private sealed class Played(GameHistory<TestState> history, Guid gameId, ApplicationDbContext reader)
    {
        public Guid GameId { get; } = gameId;
        public StoredState<TestState> Current { get; private set; } = new(0, CreateState(0));

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

        public Task<List<int>> GetStepVersionsAsync() =>
            reader
                .GameSteps.AsNoTracking()
                .Where(s => s.GameId == GameId)
                .OrderBy(s => s.Version)
                .Select(s => s.Version)
                .ToListAsync();

        public Task<List<int>> GetSnapshotVersionsAsync() =>
            reader
                .GameSnapshots.AsNoTracking()
                .Where(s => s.GameId == GameId)
                .OrderBy(s => s.Version)
                .Select(s => s.Version)
                .ToListAsync();
    }

    private GameHistoryCleanup CreateCleanup(FakeLogger<GameHistoryCleanup>? logger = null) =>
        new(fixture.CreateDbContext(), logger ?? new FakeLogger<GameHistoryCleanup>());

    private async Task<Played> BeginGameAsync()
    {
        var gameId = await SeedGameAsync();
        var history = new GameHistory<TestState>(
            fixture.CreateDbContext(),
            NullLogger<GameHistory<TestState>>.Instance
        );
        var begun = await history.Begin(gameId, CreateState(0), CancellationToken.None);
        Assert.Equal(new StoredState<TestState>(0, CreateState(0)), begun);
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

    private static async Task<Played> PlayBaselineThenCheckpointsThenIrreversibleAsync(Played game)
    {
        await game.AppendAsync(CreateStep(1));
        await game.AppendAsync(CreateStep(2));
        await game.AppendAsync(CreateStep(3, baseline: true));
        await game.AppendAsync(CreateStep(4, checkpoint: "a"));
        await game.AppendAsync(CreateStep(5, checkpoint: "b"));
        await game.AppendAsync(CreateStep(6, irreversible: true));
        await game.AppendAsync(CreateStep(7));
        return game;
    }

    private static async Task<Played> PlayBaselineThenIrreversibleWithCheckpointAsync(Played game)
    {
        await game.AppendAsync(CreateStep(1));
        await game.AppendAsync(CreateStep(2, baseline: true));
        await game.AppendAsync(CreateStep(3, checkpoint: "a"));
        await game.AppendAsync(CreateStep(4));
        await game.AppendAsync(CreateStep(5, checkpoint: "b", irreversible: true));
        await game.AppendAsync(CreateStep(6));
        return game;
    }

    private static async Task<Played> PlayIrreversibleThenBaselineAsync(Played game)
    {
        await game.AppendAsync(CreateStep(1));
        await game.AppendAsync(CreateStep(2, checkpoint: "a", irreversible: true));
        await game.AppendAsync(CreateStep(3, checkpoint: "b"));
        await game.AppendAsync(CreateStep(4));
        await game.AppendAsync(CreateStep(5, baseline: true));
        await game.AppendAsync(CreateStep(6));
        return game;
    }

    [Fact]
    public async Task Run_BaselineThenCheckpointsThenIrreversibleWithoutCheckpoint_KeepsBaselineAndNewestSnapshots()
    {
        var game = await PlayBaselineThenCheckpointsThenIrreversibleAsync(await BeginGameAsync());

        var result = await CreateCleanup().Run(CancellationToken.None);

        Assert.NotNull(result);
        Assert.Equal([3, 4, 5, 6, 7], await game.GetStepVersionsAsync());
        Assert.Equal([3, 5], await game.GetSnapshotVersionsAsync());
    }

    [Fact]
    public async Task Run_BaselineThenIrreversibleWithCheckpoint_KeepsBaselineAndIrreversibleSnapshots()
    {
        var game = await PlayBaselineThenIrreversibleWithCheckpointAsync(await BeginGameAsync());

        await CreateCleanup().Run(CancellationToken.None);

        Assert.Equal([2, 3, 4, 5, 6], await game.GetStepVersionsAsync());
        Assert.Equal([2, 5], await game.GetSnapshotVersionsAsync());
    }

    [Fact]
    public async Task Run_IrreversibleBeforeBaseline_KeepsOnlyBaselineSnapshot()
    {
        var game = await PlayIrreversibleThenBaselineAsync(await BeginGameAsync());

        await CreateCleanup().Run(CancellationToken.None);

        Assert.Equal([5, 6], await game.GetStepVersionsAsync());
        Assert.Equal([5], await game.GetSnapshotVersionsAsync());
    }

    [Fact]
    public async Task Run_NoBaselineAndNoIrreversible_DeletesNothing()
    {
        var game = await BeginGameAsync();
        await game.AppendAsync(CreateStep(1));
        await game.AppendAsync(CreateStep(2, checkpoint: "a"));
        await game.AppendAsync(CreateStep(3));

        await CreateCleanup().Run(CancellationToken.None);

        Assert.Equal([1, 2, 3], await game.GetStepVersionsAsync());
        Assert.Equal([0, 2], await game.GetSnapshotVersionsAsync());
    }

    [Theory]
    [InlineData(1)]
    [InlineData(2)]
    [InlineData(3)]
    public async Task Run_AnyOrdering_LeavesEveryLoadUnchanged(int ordering)
    {
        var game = ordering switch
        {
            1 => await PlayBaselineThenCheckpointsThenIrreversibleAsync(await BeginGameAsync()),
            2 => await PlayBaselineThenIrreversibleWithCheckpointAsync(await BeginGameAsync()),
            _ => await PlayIrreversibleThenBaselineAsync(await BeginGameAsync()),
        };
        var before = await game.LoadEverythingAsync();

        await CreateCleanup().Run(CancellationToken.None);

        Assert.Equal(before, await game.LoadEverythingAsync());
    }

    [Fact]
    public async Task Run_AnotherRunHoldsTheLock_SkipsAndDeletesNothing()
    {
        var game = await PlayBaselineThenCheckpointsThenIrreversibleAsync(await BeginGameAsync());
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
        Assert.Equal([1, 2, 3, 4, 5, 6, 7], await game.GetStepVersionsAsync());
        Assert.Equal([0, 3, 4, 5], await game.GetSnapshotVersionsAsync());
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
            await game.AppendAsync(CreateStep(n, checkpoint: n % 5 == 0 ? "c" : null, baseline: isBaseline));
            if (isBaseline)
                latestBaseline = n;
        }

        await done.CancelAsync();
        await Task.WhenAll(cleaners);
        await CreateCleanup().Run(CancellationToken.None);

        Assert.Equal(Enumerable.Range(latestBaseline, steps - latestBaseline + 1), await game.GetStepVersionsAsync());
        var history = new GameHistory<TestState>(
            fixture.CreateDbContext(),
            NullLogger<GameHistory<TestState>>.Instance
        );
        Assert.Equal(
            new StoredState<TestState>(steps, CreateState(steps)),
            await history.LoadCurrent(game.GameId, CancellationToken.None)
        );
    }
}
