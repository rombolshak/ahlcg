using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Logging.Testing;
using Tablier;
using Tablier.Contract;
using Tablier.Data;

namespace Ahlcg.ApiService.IntegrationTests;

[Collection(AppCollection.Name)]
public class GameHistoryTests(AppFixture fixture)
{
    private sealed record TestState(int Counter, string Label, bool Flag) : ISchemaVersioned
    {
        public int SchemaVersion => 1;
    }

    private static TestState State(int n) => new(n, $"state {n}", n % 2 == 0);

    private static StepResult<TestState> Step(
        int n, string? checkpoint = null, bool irreversible = false, bool baseline = false) =>
        new(State(n), checkpoint, irreversible, baseline);

    private sealed class Run(GameHistory<TestState> history, Guid gameId, ApplicationDbContext reader)
    {
        public Guid GameId { get; } = gameId;
        public GameHistory<TestState> History { get; } = history;
        public StoredState<TestState> Current { get; private set; } = new(0, State(0));

        public async Task AppendAsync(StepResult<TestState> step, PlayerChoice? choice = null)
        {
            var appended = await History.Append(GameId, Current, step, choice, CancellationToken.None);
            Current = Assert.IsType<StoredState<TestState>>(appended);
        }

        public async Task AppendPlainAsync(int from, int to)
        {
            for (var n = from; n <= to; n++) await AppendAsync(Step(n));
        }

        public async Task<StoredState<TestState>?> LoadCurrentAsync() =>
            await History.LoadCurrent(GameId, CancellationToken.None);

        public Task<List<int>> StepVersionsAsync() => reader.GameSteps.AsNoTracking()
            .Where(s => s.GameId == GameId).OrderBy(s => s.Version).Select(s => s.Version).ToListAsync();

        public Task<List<int>> SnapshotVersionsAsync() => reader.GameSnapshots.AsNoTracking()
            .Where(s => s.GameId == GameId).OrderBy(s => s.Version).Select(s => s.Version).ToListAsync();
    }

    private GameHistory<TestState> NewHistory(ILogger<GameHistory<TestState>>? logger = null) =>
        new(fixture.CreateDbContext(), logger ?? NullLogger<GameHistory<TestState>>.Instance);

    private async Task<Run> BeginRunAsync(ILogger<GameHistory<TestState>>? logger = null)
    {
        var gameId = await SeedGameAsync();
        var history = NewHistory(logger);
        var begun = await history.Begin(gameId, State(0), CancellationToken.None);
        Assert.Equal(new StoredState<TestState>(0, State(0)), begun);
        return new Run(history, gameId, fixture.CreateDbContext());
    }

    private async Task<Guid> SeedGameAsync()
    {
        var now = DateTimeOffset.UtcNow;
        var user = new AppUser { Id = Guid.NewGuid().ToString(), UserName = Guid.NewGuid().ToString(), IsAnonymous = true };
        var game = new Game
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

    [Fact]
    public async Task LoadCurrent_AfterBeginAndAppends_ReturnsLastAppendedState()
    {
        var run = await BeginRunAsync();
        await run.AppendPlainAsync(1, 5);

        var loaded = await run.LoadCurrentAsync();

        Assert.Equal(new StoredState<TestState>(5, State(5)), loaded);
    }

    [Fact]
    public async Task LoadCurrent_CheckpointBeforeLaterSteps_EqualsResultWithoutCheckpoint()
    {
        var withCheckpoint = await BeginRunAsync();
        await withCheckpoint.AppendPlainAsync(1, 2);
        await withCheckpoint.AppendAsync(Step(3, checkpoint: "mid"));
        await withCheckpoint.AppendPlainAsync(4, 6);
        var without = await BeginRunAsync();
        await without.AppendPlainAsync(1, 6);

        var loadedWith = await withCheckpoint.LoadCurrentAsync();
        var loadedWithout = await without.LoadCurrentAsync();

        Assert.Equal([0, 3], await withCheckpoint.SnapshotVersionsAsync());
        Assert.Equal(new StoredState<TestState>(6, State(6)), loadedWith);
        Assert.Equal(loadedWithout, loadedWith);
    }

    [Fact]
    public async Task Append_CheckpointStep_WritesSnapshotEqualToStepState()
    {
        var run = await BeginRunAsync();

        await run.AppendAsync(Step(1, checkpoint: "mid"));

        await using var db = fixture.CreateDbContext();
        var snapshot = await db.GameSnapshots.AsNoTracking().SingleAsync(s => s.GameId == run.GameId && s.Version == 1);
        Assert.Equal(State(1), snapshot.State.RootElement.Deserialize<TestState>());
        Assert.Equal(1, snapshot.SchemaVersion);
        var step = await db.GameSteps.AsNoTracking().SingleAsync(s => s.GameId == run.GameId && s.Version == 1);
        Assert.Equal("mid", step.Checkpoint);
    }

    [Fact]
    public async Task Append_PlainStep_AddsNoSnapshotAndDeletesNothing()
    {
        var run = await BeginRunAsync();
        await run.AppendAsync(Step(1, checkpoint: "mid"));

        await run.AppendPlainAsync(2, 3);

        Assert.Equal([1, 2, 3], await run.StepVersionsAsync());
        Assert.Equal([0, 1], await run.SnapshotVersionsAsync());
    }

    [Fact]
    public async Task Append_EachStep_ReturnsPreviousHeadPlusOne()
    {
        var run = await BeginRunAsync();

        var first = await run.History.Append(run.GameId, run.Current, Step(1), null, CancellationToken.None);
        var second = await run.History.Append(run.GameId, first!, Step(2), null, CancellationToken.None);

        Assert.Equal(new StoredState<TestState>(1, State(1)), first);
        Assert.Equal(new StoredState<TestState>(2, State(2)), second);
    }

    [Fact]
    public async Task Append_StalePreviousVersion_IsRefusedAndStoresNothing()
    {
        var run = await BeginRunAsync();
        var stale = run.Current;
        await run.AppendPlainAsync(1, 2);

        var refused = await run.History.Append(run.GameId, stale, Step(9), null, CancellationToken.None);

        Assert.Null(refused);
        Assert.Equal([1, 2], await run.StepVersionsAsync());
        Assert.Equal([0], await run.SnapshotVersionsAsync());
    }

    [Fact]
    public async Task Append_GameNotBegun_IsRefused()
    {
        var gameId = await SeedGameAsync();
        var history = new GameHistory<TestState>(fixture.CreateDbContext(), NullLogger<GameHistory<TestState>>.Instance);

        var refused = await history.Append(
            gameId, new StoredState<TestState>(0, State(0)), Step(1), null, CancellationToken.None);

        Assert.Null(refused);
        await using var db = fixture.CreateDbContext();
        Assert.False(await db.GameSteps.AnyAsync(s => s.GameId == gameId));
    }

    [Fact]
    public async Task Begin_GameAlreadyBegun_IsRefusedAndKeepsHistory()
    {
        var run = await BeginRunAsync();
        await run.AppendPlainAsync(1, 2);

        var refused = await run.History.Begin(run.GameId, State(7), CancellationToken.None);

        Assert.Null(refused);
        Assert.Equal(new StoredState<TestState>(2, State(2)), await run.LoadCurrentAsync());
    }

    [Fact]
    public async Task Append_BaselineStep_DeletesEverythingBelowIt()
    {
        var run = await BeginRunAsync();
        await run.AppendPlainAsync(1, 1);
        await run.AppendAsync(Step(2, checkpoint: "a"));
        await run.AppendPlainAsync(3, 3);
        await run.AppendAsync(Step(4, checkpoint: "b"));

        await run.AppendAsync(Step(5, baseline: true));

        Assert.Equal([5], await run.StepVersionsAsync());
        Assert.Equal([5], await run.SnapshotVersionsAsync());
        Assert.Equal(new StoredState<TestState>(5, State(5)), await run.LoadCurrentAsync());

        await run.AppendPlainAsync(6, 7);

        Assert.Equal([5, 6, 7], await run.StepVersionsAsync());
        Assert.Equal(new StoredState<TestState>(7, State(7)), await run.LoadCurrentAsync());
    }

    [Fact]
    public async Task Append_IrreversibleStep_DeletesOnlySnapshotsBetweenBaselineAndIt()
    {
        var run = await BeginRunAsync();
        await run.AppendPlainAsync(1, 1);
        await run.AppendAsync(Step(2, baseline: true));
        await run.AppendAsync(Step(3, checkpoint: "a"));
        await run.AppendAsync(Step(4, checkpoint: "b"));
        await run.AppendPlainAsync(5, 5);

        await run.AppendAsync(Step(6, irreversible: true));

        Assert.Equal([2], await run.SnapshotVersionsAsync());
        Assert.Equal([2, 3, 4, 5, 6], await run.StepVersionsAsync());
        Assert.Equal(new StoredState<TestState>(6, State(6)), await run.LoadCurrentAsync());

        await run.AppendPlainAsync(7, 7);

        Assert.Equal(new StoredState<TestState>(7, State(7)), await run.LoadCurrentAsync());
    }

    [Fact]
    public async Task Append_IrreversibleCheckpointStep_KeepsItsOwnSnapshot()
    {
        var run = await BeginRunAsync();
        await run.AppendAsync(Step(1, checkpoint: "a"));
        await run.AppendPlainAsync(2, 2);

        await run.AppendAsync(Step(3, checkpoint: "reveal", irreversible: true));

        Assert.Equal([0, 3], await run.SnapshotVersionsAsync());
        Assert.Equal(new StoredState<TestState>(3, State(3)), await run.LoadCurrentAsync());
    }

    [Fact]
    public async Task LoadAt_CheckpointVersionAndZero_ReturnsSnapshotState()
    {
        var run = await BeginRunAsync();
        await run.AppendPlainAsync(1, 1);
        await run.AppendAsync(Step(2, checkpoint: "mid"));
        await run.AppendPlainAsync(3, 3);

        var atZero = await run.History.LoadAt(run.GameId, 0, CancellationToken.None);
        var atCheckpoint = await run.History.LoadAt(run.GameId, 2, CancellationToken.None);

        Assert.Equal(new StoredState<TestState>(0, State(0)), atZero);
        Assert.Equal(new StoredState<TestState>(2, State(2)), atCheckpoint);
    }

    [Fact]
    public async Task LoadAt_VersionWithoutSnapshot_IsRefused()
    {
        var run = await BeginRunAsync();
        await run.AppendAsync(Step(1, checkpoint: "mid"));
        await run.AppendPlainAsync(2, 3);

        Assert.Null(await run.History.LoadAt(run.GameId, 3, CancellationToken.None));
        Assert.Null(await run.History.LoadAt(run.GameId, 99, CancellationToken.None));
    }

    [Fact]
    public async Task Truncate_ToVersionWithRowsOnBothSides_RewindsToThatVersion()
    {
        var run = await BeginRunAsync();
        await run.AppendPlainAsync(1, 2);
        await run.AppendAsync(Step(3, checkpoint: "a"));
        await run.AppendPlainAsync(4, 4);
        await run.AppendAsync(Step(5, checkpoint: "b"));
        await run.AppendPlainAsync(6, 6);
        var beforeTruncate = run.Current;

        var truncated = await run.History.Truncate(run.GameId, 4, CancellationToken.None);

        Assert.True(truncated);
        Assert.Equal([1, 2, 3, 4], await run.StepVersionsAsync());
        Assert.Equal([0, 3], await run.SnapshotVersionsAsync());
        var reloaded = await run.LoadCurrentAsync();
        Assert.Equal(new StoredState<TestState>(4, State(4)), reloaded);

        var stale = await run.History.Append(run.GameId, beforeTruncate, Step(7), null, CancellationToken.None);
        var next = await run.History.Append(run.GameId, reloaded!, Step(50), null, CancellationToken.None);

        Assert.Null(stale);
        Assert.Equal(new StoredState<TestState>(5, State(50)), next);
    }

    [Fact]
    public async Task Truncate_AtHead_DeletesNothing()
    {
        var run = await BeginRunAsync();
        await run.AppendAsync(Step(1, checkpoint: "a"));
        await run.AppendPlainAsync(2, 3);

        var truncated = await run.History.Truncate(run.GameId, 3, CancellationToken.None);

        Assert.True(truncated);
        Assert.Equal([1, 2, 3], await run.StepVersionsAsync());
        Assert.Equal([0, 1], await run.SnapshotVersionsAsync());
    }

    [Fact]
    public async Task Truncate_AtVersionWithSnapshot_KeepsThatSnapshot()
    {
        var run = await BeginRunAsync();
        await run.AppendPlainAsync(1, 2);
        await run.AppendAsync(Step(3, checkpoint: "a"));
        await run.AppendPlainAsync(4, 4);
        await run.AppendAsync(Step(5, checkpoint: "b"));

        var truncated = await run.History.Truncate(run.GameId, 3, CancellationToken.None);

        Assert.True(truncated);
        Assert.Equal([0, 3], await run.SnapshotVersionsAsync());
        Assert.Equal([1, 2, 3], await run.StepVersionsAsync());
        Assert.Equal(new StoredState<TestState>(3, State(3)), await run.LoadCurrentAsync());
    }

    [Fact]
    public async Task Truncate_AtFloor_IsAcceptedAndRewindsToIt()
    {
        var run = await BeginRunAsync();
        await run.AppendPlainAsync(1, 2);
        await run.AppendAsync(Step(3, baseline: true));
        await run.AppendPlainAsync(4, 5);

        var truncated = await run.History.Truncate(run.GameId, 3, CancellationToken.None);

        Assert.True(truncated);
        Assert.Equal([3], await run.StepVersionsAsync());
        Assert.Equal([3], await run.SnapshotVersionsAsync());
        Assert.Equal(new StoredState<TestState>(3, State(3)), await run.LoadCurrentAsync());
    }

    [Fact]
    public async Task Truncate_BelowFloor_IsRefusedAndDeletesNothing()
    {
        var run = await BeginRunAsync();
        await run.AppendPlainAsync(1, 2);
        await run.AppendAsync(Step(3, baseline: true));
        await run.AppendPlainAsync(4, 5);

        var truncated = await run.History.Truncate(run.GameId, 2, CancellationToken.None);

        Assert.False(truncated);
        Assert.Equal([3, 4, 5], await run.StepVersionsAsync());
        Assert.Equal(new StoredState<TestState>(5, State(5)), await run.LoadCurrentAsync());
    }

    [Fact]
    public async Task Truncate_GameNotBegun_IsRefused()
    {
        var gameId = await SeedGameAsync();
        var history = new GameHistory<TestState>(fixture.CreateDbContext(), NullLogger<GameHistory<TestState>>.Instance);

        Assert.False(await history.Truncate(gameId, 0, CancellationToken.None));
    }

    [Fact]
    public async Task LoadCurrent_GameNotBegun_IsRefused()
    {
        var gameId = await SeedGameAsync();
        var history = new GameHistory<TestState>(fixture.CreateDbContext(), NullLogger<GameHistory<TestState>>.Instance);

        Assert.Null(await history.LoadCurrent(gameId, CancellationToken.None));
    }

    [Fact]
    public async Task Append_WithoutChoice_StoresNullActorAndAction()
    {
        var run = await BeginRunAsync();

        await run.AppendAsync(Step(1));

        await using var db = fixture.CreateDbContext();
        var step = await db.GameSteps.AsNoTracking().SingleAsync(s => s.GameId == run.GameId);
        Assert.Null(step.Actor);
        Assert.Null(step.Action);
    }

    [Fact]
    public async Task Append_WithChoice_StoresActorAndAction()
    {
        var run = await BeginRunAsync();

        await run.AppendAsync(Step(1), new PlayerChoice("member-1", "shared.increment"));

        await using var db = fixture.CreateDbContext();
        var step = await db.GameSteps.AsNoTracking().SingleAsync(s => s.GameId == run.GameId);
        Assert.Equal("member-1", step.Actor);
        Assert.Equal("shared.increment", step.Action);
    }

    [Fact]
    public async Task DeleteGame_WithHistory_CascadesToStepsAndSnapshots()
    {
        var run = await BeginRunAsync();
        await run.AppendAsync(Step(1, checkpoint: "mid"));
        await run.AppendPlainAsync(2, 2);

        await using var db = fixture.CreateDbContext();
        await db.Games.Where(g => g.Id == run.GameId).ExecuteDeleteAsync();

        Assert.Empty(await run.StepVersionsAsync());
        Assert.Empty(await run.SnapshotVersionsAsync());
    }

    [Fact]
    public async Task Append_ConcurrentlyFromSamePrevious_AcceptsExactlyOne()
    {
        var run = await BeginRunAsync();

        var results = await Task.WhenAll(Enumerable.Range(1, 8).Select(n =>
            NewHistory().Append(run.GameId, run.Current, Step(n), null, CancellationToken.None)));

        Assert.Single(results, r => r is not null);
        Assert.Equal([1], await run.StepVersionsAsync());
    }

    [Fact]
    public async Task Begin_ConcurrentlyOnSameGame_AcceptsExactlyOne()
    {
        var gameId = await SeedGameAsync();

        var results = await Task.WhenAll(Enumerable.Range(1, 8).Select(_ =>
            NewHistory().Begin(gameId, State(0), CancellationToken.None)));

        Assert.Single(results, r => r is not null);
    }

    [Fact]
    public async Task Begin_UnknownGame_Throws()
    {
        var history = NewHistory();

        await Assert.ThrowsAsync<DbUpdateException>(() =>
            history.Begin(Guid.NewGuid(), State(0), CancellationToken.None));
    }

    [Fact]
    public async Task Begin_ContextHasPendingChanges_ThrowsAndLeavesThemPending()
    {
        var gameId = await SeedGameAsync();
        await using var db = fixture.CreateDbContext();
        var history = new GameHistory<TestState>(db, NullLogger<GameHistory<TestState>>.Instance);
        var game = await TrackModifiedGameAsync(db, gameId);

        await Assert.ThrowsAsync<InvalidOperationException>(() =>
            history.Begin(gameId, State(0), CancellationToken.None));

        Assert.Equal(EntityState.Modified, db.Entry(game).State);
        await using var reader = fixture.CreateDbContext();
        Assert.False(await reader.GameSnapshots.AnyAsync(s => s.GameId == gameId));
        Assert.Equal(1, (await reader.Games.AsNoTracking().SingleAsync(g => g.Id == gameId)).IntendedPlayersCount);
    }

    [Fact]
    public async Task Append_ContextHasPendingChanges_ThrowsAndLeavesThemPending()
    {
        var gameId = await SeedGameAsync();
        await using var db = fixture.CreateDbContext();
        var history = new GameHistory<TestState>(db, NullLogger<GameHistory<TestState>>.Instance);
        var begun = await history.Begin(gameId, State(0), CancellationToken.None);
        var game = await TrackModifiedGameAsync(db, gameId);

        await Assert.ThrowsAsync<InvalidOperationException>(() =>
            history.Append(gameId, begun!, Step(1), null, CancellationToken.None));

        Assert.Equal(EntityState.Modified, db.Entry(game).State);
        await using var reader = fixture.CreateDbContext();
        Assert.False(await reader.GameSteps.AnyAsync(s => s.GameId == gameId));
        Assert.Equal(1, (await reader.Games.AsNoTracking().SingleAsync(g => g.Id == gameId)).IntendedPlayersCount);
    }

    [Fact]
    public async Task Truncate_ContextHasPendingChanges_ThrowsAndLeavesThemPending()
    {
        var gameId = await SeedGameAsync();
        await using var db = fixture.CreateDbContext();
        var history = new GameHistory<TestState>(db, NullLogger<GameHistory<TestState>>.Instance);
        var begun = await history.Begin(gameId, State(0), CancellationToken.None);
        await history.Append(gameId, begun!, Step(1), null, CancellationToken.None);
        var game = await TrackModifiedGameAsync(db, gameId);

        await Assert.ThrowsAsync<InvalidOperationException>(() =>
            history.Truncate(gameId, 0, CancellationToken.None));

        Assert.Equal(EntityState.Modified, db.Entry(game).State);
        await using var reader = fixture.CreateDbContext();
        Assert.Equal([1], await reader.GameSteps.Where(s => s.GameId == gameId).Select(s => s.Version).ToListAsync());
        Assert.Equal(1, (await reader.Games.AsNoTracking().SingleAsync(g => g.Id == gameId)).IntendedPlayersCount);
    }

    private static async Task<Game> TrackModifiedGameAsync(ApplicationDbContext db, Guid gameId)
    {
        var game = await db.Games.SingleAsync(g => g.Id == gameId);
        game.IntendedPlayersCount = 4;
        return game;
    }

    [Fact]
    public async Task Begin_Twice_LogsAlreadyBegun()
    {
        var logger = new FakeLogger<GameHistory<TestState>>();
        var run = await BeginRunAsync(logger);

        await run.History.Begin(run.GameId, State(0), CancellationToken.None);

        Assert.Equal("LogBeginRefusedAlreadyBegun", logger.LatestRecord.Id.Name);
    }

    [Fact]
    public async Task Append_StalePreviousVersion_LogsStale()
    {
        var logger = new FakeLogger<GameHistory<TestState>>();
        var run = await BeginRunAsync(logger);
        var stale = run.Current;
        await run.AppendPlainAsync(1, 1);

        await run.History.Append(run.GameId, stale, Step(2), null, CancellationToken.None);

        Assert.Equal("LogAppendRefusedStale", logger.LatestRecord.Id.Name);
    }

    [Fact]
    public async Task LoadAt_VersionWithoutSnapshot_LogsNoSnapshot()
    {
        var logger = new FakeLogger<GameHistory<TestState>>();
        var run = await BeginRunAsync(logger);

        await run.History.LoadAt(run.GameId, 5, CancellationToken.None);

        Assert.Equal("LogLoadAtRefusedNoSnapshot", logger.LatestRecord.Id.Name);
    }

    [Fact]
    public async Task Truncate_BelowFloor_LogsBelowFloor()
    {
        var logger = new FakeLogger<GameHistory<TestState>>();
        var run = await BeginRunAsync(logger);
        await run.AppendPlainAsync(1, 1);
        await run.AppendAsync(Step(2, baseline: true));

        await run.History.Truncate(run.GameId, 1, CancellationToken.None);

        Assert.Equal("LogTruncateRefusedBelowFloor", logger.LatestRecord.Id.Name);
    }
}
