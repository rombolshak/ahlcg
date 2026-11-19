using System.Globalization;
using System.Text.Json;
using Ahlcg.ApiService.IntegrationTests.Fixture;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Logging.Abstractions;
using Tablier.Contract;
using Tablier.Data;
using Tablier.Engine.History;

namespace Ahlcg.ApiService.IntegrationTests.Engine.History;

[Collection(AppCollection.Name)]
public class GameHistoryTests(AppFixture fixture)
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
    ) =>
        new(CreateState(n), checkpoint is null ? [] : [checkpoint], IsIrreversible: irreversible, IsBaseline: baseline);

    private sealed class Run(GameHistory<TestState> history, Guid gameId, ApplicationDbContext reader)
    {
        public Guid GameId { get; } = gameId;
        public GameHistory<TestState> History { get; } = history;
        public StoredState<TestState> Current { get; private set; } = new(0, CreateState(0));

        public async Task AppendAsync(StepResult<TestState> step, PlayerChoice? choice = null)
        {
            var appended = await History.Append(GameId, Current, step, choice, CancellationToken.None);
            Current = Assert.IsType<StoredState<TestState>>(appended);
        }

        public async Task AppendPlainAsync(int from, int to)
        {
            for (var n = from; n <= to; n++)
                await AppendAsync(CreateStep(n));
        }

        public async Task<StoredState<TestState>?> LoadCurrentAsync() =>
            await History.LoadCurrent(GameId, CancellationToken.None);

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

    private GameHistory<TestState> CreateHistory(ILogger<GameHistory<TestState>>? logger = null) =>
        new(fixture.CreateDbContext(), logger ?? NullLogger<GameHistory<TestState>>.Instance);

    private async Task<Run> BeginRunAsync(ILogger<GameHistory<TestState>>? logger = null)
    {
        var gameId = await SeedGameAsync();
        var history = CreateHistory(logger);
        var begun = await history.Begin(gameId, CreateState(0), CancellationToken.None);
        Assert.Equal(new StoredState<TestState>(0, CreateState(0)), begun);
        return new Run(history, gameId, fixture.CreateDbContext());
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
    public async Task Begin_AtVersionZeroWithDifferentInput_ReturnsExactStoredStateWithoutWriting()
    {
        var run = await BeginRunAsync();

        var replayed = await run.History.Begin(run.GameId, CreateState(7));

        Assert.Equal(new StoredState<TestState>(0, CreateState(0)), replayed);
        Assert.Equal([0], await run.GetSnapshotVersionsAsync());
        Assert.Empty(await run.GetStepVersionsAsync());
    }

    [Theory]
    [InlineData(false)]
    [InlineData(true)]
    public async Task Load_NullStoredPatch_ThrowsDescriptiveException(bool historical)
    {
        var run = await BeginRunAsync();
        await run.AppendPlainAsync(1, 1);
        await using var db = fixture.CreateDbContext();
        var step = await db.GameSteps.SingleAsync(s => s.GameId == run.GameId && s.Version == 1);
        step.Patch = JsonDocument.Parse("null");
        await db.SaveChangesAsync();

        var error = await Assert.ThrowsAsync<InvalidOperationException>(async () =>
        {
            if (historical)
                await run.History.LoadAt(run.GameId, 1);
            else
                await run.History.LoadCurrent(run.GameId);
        });

        Assert.Equal("A stored step patch cannot be null.", error.Message);
    }

    [Fact]
    public async Task LoadCurrent_MalformedStoredPatch_ThrowsWithPatchContextAndInnerException()
    {
        var run = await BeginRunAsync();
        await run.AppendPlainAsync(1, 1);
        await using var db = fixture.CreateDbContext();
        var step = await db.GameSteps.SingleAsync(s => s.GameId == run.GameId && s.Version == 1);
        step.Patch = JsonDocument.Parse("{}");
        await db.SaveChangesAsync();

        var error = await Assert.ThrowsAsync<InvalidOperationException>(() => run.History.LoadCurrent(run.GameId));

        Assert.IsType<JsonException>(error.InnerException, exactMatch: false);
        Assert.Equal($"Patch at version 1 of game {run.GameId} is malformed.", error.Message);
    }

    [Fact]
    public async Task LoadAt_MalformedSnapshot_ThrowsWithSnapshotContextAndInnerException()
    {
        var run = await BeginRunAsync();
        await using var db = fixture.CreateDbContext();
        var snapshot = await db.GameSnapshots.SingleAsync(s => s.GameId == run.GameId && s.Version == 0);
        snapshot.State = JsonDocument.Parse("""{"Counter":"invalid"}""");
        await db.SaveChangesAsync();

        var error = await Assert.ThrowsAsync<InvalidOperationException>(() => run.History.LoadAt(run.GameId, 0));

        Assert.IsType<JsonException>(error.InnerException, exactMatch: false);
        Assert.Equal($"Snapshot state at version 0 of game {run.GameId} is malformed.", error.Message);
    }

    [Fact]
    public async Task LoadCurrent_MalformedReconstructedState_ThrowsWithStateContextAndInnerException()
    {
        var run = await BeginRunAsync();
        await run.AppendPlainAsync(1, 1);
        await using var db = fixture.CreateDbContext();
        var step = await db.GameSteps.SingleAsync(s => s.GameId == run.GameId && s.Version == 1);
        step.Patch = JsonDocument.Parse("""[{"op":"replace","path":"/Counter","value":"invalid"}]""");
        await db.SaveChangesAsync();

        var error = await Assert.ThrowsAsync<InvalidOperationException>(() => run.History.LoadCurrent(run.GameId));

        Assert.IsType<JsonException>(error.InnerException, exactMatch: false);
        Assert.Equal($"Reconstructed state at version 1 of game {run.GameId} is malformed.", error.Message);
    }

    [Fact]
    public async Task LoadCurrent_PatchGap_Throws()
    {
        var run = await BeginRunAsync();
        await run.AppendPlainAsync(1, 3);
        await using var db = fixture.CreateDbContext();
        await db.GameSteps.Where(s => s.GameId == run.GameId && s.Version == 2).ExecuteDeleteAsync();

        await Assert.ThrowsAsync<InvalidOperationException>(() => run.History.LoadCurrent(run.GameId));
    }

    [Fact]
    public async Task LoadCurrent_StepsWithoutSnapshot_Throws()
    {
        var run = await BeginRunAsync();
        await run.AppendPlainAsync(1, 2);
        await using var db = fixture.CreateDbContext();
        await db.GameSnapshots.Where(s => s.GameId == run.GameId).ExecuteDeleteAsync();

        await Assert.ThrowsAsync<InvalidOperationException>(() => run.History.LoadCurrent(run.GameId));
    }

    [Fact]
    public async Task LoadAt_LatestSnapshotWithoutMatchingStep_ReturnsExactStoredState()
    {
        var run = await BeginRunAsync();
        await run.AppendPlainAsync(1, 1);
        await run.AppendAsync(CreateStep(2, checkpoint: "latest"));
        await using var db = fixture.CreateDbContext();
        await db.GameSteps.Where(s => s.GameId == run.GameId && s.Version == 2).ExecuteDeleteAsync();

        var loaded = await run.History.LoadAt(run.GameId, 2);

        Assert.Equal(new StoredState<TestState>(2, CreateState(2)), loaded);
    }

    [Fact]
    public async Task LoadAt_ExactSnapshotWithoutStep_ReturnsStoredState()
    {
        var run = await BeginRunAsync();
        await run.AppendAsync(CreateStep(1, checkpoint: "mid"));
        await run.AppendPlainAsync(2, 3);
        await using var db = fixture.CreateDbContext();
        await db.GameSteps.Where(s => s.GameId == run.GameId && s.Version == 1).ExecuteDeleteAsync();

        var loaded = await run.History.LoadAt(run.GameId, 1, CancellationToken.None);

        Assert.Equal(new StoredState<TestState>(1, CreateState(1)), loaded);
    }

    [Fact]
    public async Task LoadAt_PlainVersionBeforeLaterSteps_ReconstructsOnlyThroughRequestedVersion()
    {
        var run = await BeginRunAsync();
        await run.AppendPlainAsync(1, 4);

        var loaded = await run.History.LoadAt(run.GameId, 2, CancellationToken.None);

        Assert.Equal(new StoredState<TestState>(2, CreateState(2)), loaded);
    }

    [Fact]
    public async Task LoadAt_PatchGap_Throws()
    {
        var run = await BeginRunAsync();
        await run.AppendPlainAsync(1, 3);
        await using var db = fixture.CreateDbContext();
        await db.GameSteps.Where(s => s.GameId == run.GameId && s.Version == 2).ExecuteDeleteAsync();

        await Assert.ThrowsAsync<InvalidOperationException>(() =>
            run.History.LoadAt(run.GameId, 3, CancellationToken.None)
        );
    }

    [Fact]
    public async Task LoadAt_MissingEarlierSnapshot_Throws()
    {
        var run = await BeginRunAsync();
        await run.AppendPlainAsync(1, 2);
        await using var db = fixture.CreateDbContext();
        await db.GameSnapshots.Where(s => s.GameId == run.GameId).ExecuteDeleteAsync();

        await Assert.ThrowsAsync<InvalidOperationException>(() =>
            run.History.LoadAt(run.GameId, 2, CancellationToken.None)
        );
    }

    [Theory]
    [InlineData(-1)]
    [InlineData(3)]
    public async Task LoadAt_VersionOutsideStoredRange_Throws(int version)
    {
        var run = await BeginRunAsync();
        await run.AppendPlainAsync(1, 2);

        await Assert.ThrowsAsync<ArgumentOutOfRangeException>(() =>
            run.History.LoadAt(run.GameId, version, CancellationToken.None)
        );
    }

    [Fact]
    public async Task LoadAt_UnbegunGame_Throws()
    {
        var gameId = await SeedGameAsync();

        await Assert.ThrowsAsync<InvalidOperationException>(() =>
            CreateHistory().LoadAt(gameId, 0, CancellationToken.None)
        );
    }

    [Fact]
    public async Task Append_MultipleCheckpoints_PreservesEveryTag()
    {
        var run = await BeginRunAsync();

        await run.AppendAsync(new StepResult<TestState>(CreateState(1), ["turn", "", "phase"]));

        await using var db = fixture.CreateDbContext();
        var step = await db.GameSteps.AsNoTracking().SingleAsync(s => s.GameId == run.GameId);
        Assert.Equal(["turn", "", "phase"], step.Checkpoints);
        Assert.Equal([0, 1], await run.GetSnapshotVersionsAsync());
    }

    [Fact]
    public async Task Append_ReservedUndoCheckpoint_ThrowsAndStoresNothing()
    {
        var run = await BeginRunAsync();

        await Assert.ThrowsAsync<InvalidOperationException>(() =>
            run.History.Append(
                run.GameId,
                run.Current,
                new StepResult<TestState>(CreateState(1), ["undo"]),
                choice: null,
                CancellationToken.None
            )
        );
        Assert.Empty(await run.GetStepVersionsAsync());
        Assert.Equal([0], await run.GetSnapshotVersionsAsync());
    }

    [Fact]
    public async Task LoadCurrent_AfterBeginAndAppends_ReturnsLastAppendedState()
    {
        var run = await BeginRunAsync();
        await run.AppendPlainAsync(1, 5);

        var loaded = await run.LoadCurrentAsync();

        Assert.Equal(new StoredState<TestState>(5, CreateState(5)), loaded);
    }

    [Fact]
    public async Task LoadCurrent_CheckpointBeforeLaterSteps_EqualsResultWithoutCheckpoint()
    {
        var withCheckpoint = await BeginRunAsync();
        await withCheckpoint.AppendPlainAsync(1, 2);
        await withCheckpoint.AppendAsync(CreateStep(3, checkpoint: "mid"));
        await withCheckpoint.AppendPlainAsync(4, 6);
        var without = await BeginRunAsync();
        await without.AppendPlainAsync(1, 6);

        var loadedWith = await withCheckpoint.LoadCurrentAsync();
        var loadedWithout = await without.LoadCurrentAsync();

        Assert.Equal([0, 3], await withCheckpoint.GetSnapshotVersionsAsync());
        Assert.Equal(new StoredState<TestState>(6, CreateState(6)), loadedWith);
        Assert.Equal(loadedWithout, loadedWith);
    }

    [Fact]
    public async Task Append_CheckpointStep_WritesSnapshotEqualToStepState()
    {
        var run = await BeginRunAsync();

        await run.AppendAsync(CreateStep(1, checkpoint: "mid"));

        await using var db = fixture.CreateDbContext();
        var snapshot = await db.GameSnapshots.AsNoTracking().SingleAsync(s => s.GameId == run.GameId && s.Version == 1);
        Assert.Equal(CreateState(1), snapshot.State.RootElement.Deserialize<TestState>());
        Assert.Equal(1, snapshot.SchemaVersion);
        var step = await db.GameSteps.AsNoTracking().SingleAsync(s => s.GameId == run.GameId && s.Version == 1);
        Assert.Equal(["mid"], step.Checkpoints);
    }

    [Fact]
    public async Task Append_PlainStep_AddsNoSnapshotAndDeletesNothing()
    {
        var run = await BeginRunAsync();
        await run.AppendAsync(CreateStep(1, checkpoint: "mid"));

        await run.AppendPlainAsync(2, 3);

        Assert.Equal([1, 2, 3], await run.GetStepVersionsAsync());
        Assert.Equal([0, 1], await run.GetSnapshotVersionsAsync());
    }

    [Fact]
    public async Task Append_EachStep_ReturnsPreviousHeadPlusOne()
    {
        var run = await BeginRunAsync();

        var first = await run.History.Append(
            run.GameId,
            run.Current,
            CreateStep(1),
            choice: null,
            CancellationToken.None
        );
        var second = await run.History.Append(run.GameId, first!, CreateStep(2), choice: null, CancellationToken.None);

        Assert.Equal(new StoredState<TestState>(1, CreateState(1)), first);
        Assert.Equal(new StoredState<TestState>(2, CreateState(2)), second);
    }

    [Fact]
    public async Task Append_StalePreviousVersion_IsRefusedAndStoresNothing()
    {
        var run = await BeginRunAsync();
        var stale = run.Current;
        await run.AppendPlainAsync(1, 2);

        var refused = await run.History.Append(run.GameId, stale, CreateStep(9), choice: null, CancellationToken.None);

        Assert.Null(refused);
        Assert.Equal([1, 2], await run.GetStepVersionsAsync());
        Assert.Equal([0], await run.GetSnapshotVersionsAsync());
    }

    [Fact]
    public async Task Append_GameNotBegun_Throws()
    {
        var gameId = await SeedGameAsync();
        var history = new GameHistory<TestState>(
            fixture.CreateDbContext(),
            NullLogger<GameHistory<TestState>>.Instance
        );

        await Assert.ThrowsAsync<InvalidOperationException>(() =>
            history.Append(
                gameId,
                new StoredState<TestState>(0, CreateState(0)),
                CreateStep(1),
                choice: null,
                CancellationToken.None
            )
        );
        await using var db = fixture.CreateDbContext();
        Assert.False(await db.GameSteps.AnyAsync(s => s.GameId == gameId));
    }

    [Fact]
    public async Task Begin_GameAlreadyAdvanced_ThrowsConflictAndKeepsHistory()
    {
        var run = await BeginRunAsync();
        await run.AppendPlainAsync(1, 2);

        var conflict = await Assert.ThrowsAsync<GameHistoryConflictException>(() =>
            run.History.Begin(run.GameId, CreateState(7))
        );

        Assert.Equal(run.GameId, conflict.GameId);
        Assert.Equal(2, conflict.Version);
        Assert.Equal(new StoredState<TestState>(2, CreateState(2)), await run.LoadCurrentAsync());
    }

    [Fact]
    public async Task Append_BaselineStep_WritesSnapshotAndDeletesNothing()
    {
        var run = await BeginRunAsync();
        await run.AppendPlainAsync(1, 1);
        await run.AppendAsync(CreateStep(2, checkpoint: "a"));

        await run.AppendAsync(CreateStep(3, baseline: true));
        await run.AppendPlainAsync(4, 5);

        Assert.Equal([1, 2, 3, 4, 5], await run.GetStepVersionsAsync());
        Assert.Equal([0, 2, 3], await run.GetSnapshotVersionsAsync());
        Assert.Equal(new StoredState<TestState>(5, CreateState(5)), await run.LoadCurrentAsync());
    }

    [Fact]
    public async Task Append_IrreversibleStep_DeletesNothingAndLoadsCurrent()
    {
        var run = await BeginRunAsync();
        await run.AppendAsync(CreateStep(1, checkpoint: "a"));
        await run.AppendPlainAsync(2, 2);

        await run.AppendAsync(CreateStep(3, irreversible: true));
        await run.AppendPlainAsync(4, 4);

        Assert.Equal([1, 2, 3, 4], await run.GetStepVersionsAsync());
        Assert.Equal([0, 1, 3], await run.GetSnapshotVersionsAsync());
        Assert.Equal(new StoredState<TestState>(4, CreateState(4)), await run.LoadCurrentAsync());
    }

    [Fact]
    public async Task Append_PastStateAsIrreversibleCheckpoint_RewindsCurrentAndBarsWhatCameBefore()
    {
        var run = await BeginRunAsync();
        await run.AppendAsync(CreateStep(1, checkpoint: "turn"));
        await run.AppendPlainAsync(2, 3);
        var target = await run.History.LoadAt(run.GameId, 1, CancellationToken.None);

        await run.AppendAsync(new StepResult<TestState>(target!.State, ["turn"], IsIrreversible: true));

        Assert.Equal(new StoredState<TestState>(4, CreateState(1)), await run.LoadCurrentAsync());
        Assert.Equal(
            new StoredState<TestState>(4, CreateState(1)),
            await run.History.LoadAt(run.GameId, 4, CancellationToken.None)
        );
        await Assert.ThrowsAsync<InvalidOperationException>(() => run.History.LoadAt(run.GameId, 1));
    }

    [Fact]
    public async Task LoadAt_CheckpointBeforeIrreversibleStep_IsRefused()
    {
        var run = await BeginRunAsync();
        await run.AppendAsync(CreateStep(1, checkpoint: "a"));
        await run.AppendAsync(CreateStep(2, irreversible: true));

        await Assert.ThrowsAsync<InvalidOperationException>(() => run.History.LoadAt(run.GameId, 0));
        await Assert.ThrowsAsync<InvalidOperationException>(() => run.History.LoadAt(run.GameId, 1));
    }

    [Fact]
    public async Task LoadAt_IrreversibleCheckpointVersion_ReturnsItsState()
    {
        var run = await BeginRunAsync();
        await run.AppendAsync(CreateStep(1, checkpoint: "reveal", irreversible: true));
        await run.AppendPlainAsync(2, 2);

        Assert.Equal(
            new StoredState<TestState>(1, CreateState(1)),
            await run.History.LoadAt(run.GameId, 1, CancellationToken.None)
        );
    }

    [Fact]
    public async Task LoadAt_SnapshotBelowBaseline_IsRefused()
    {
        var run = await BeginRunAsync();
        await run.AppendAsync(CreateStep(1, checkpoint: "a"));
        await run.AppendAsync(CreateStep(2, baseline: true));

        await Assert.ThrowsAsync<InvalidOperationException>(() => run.History.LoadAt(run.GameId, 1));
        Assert.Equal(
            new StoredState<TestState>(2, CreateState(2)),
            await run.History.LoadAt(run.GameId, 2, CancellationToken.None)
        );
    }

    [Fact]
    public async Task LoadAt_CheckpointVersionAndZero_ReturnsSnapshotState()
    {
        var run = await BeginRunAsync();
        await run.AppendPlainAsync(1, 1);
        await run.AppendAsync(CreateStep(2, checkpoint: "mid"));
        await run.AppendPlainAsync(3, 3);

        var atZero = await run.History.LoadAt(run.GameId, 0, CancellationToken.None);
        var atCheckpoint = await run.History.LoadAt(run.GameId, 2, CancellationToken.None);

        Assert.Equal(new StoredState<TestState>(0, CreateState(0)), atZero);
        Assert.Equal(new StoredState<TestState>(2, CreateState(2)), atCheckpoint);
    }

    [Fact]
    public async Task LoadAt_VersionWithoutSnapshot_ReconstructsFromEarlierSnapshot()
    {
        var run = await BeginRunAsync();
        await run.AppendAsync(CreateStep(1, checkpoint: "mid"));
        await run.AppendPlainAsync(2, 3);

        Assert.Equal(
            new StoredState<TestState>(3, CreateState(3)),
            await run.History.LoadAt(run.GameId, 3, CancellationToken.None)
        );
        await Assert.ThrowsAsync<ArgumentOutOfRangeException>(() => run.History.LoadAt(run.GameId, 99));
    }

    [Fact]
    public async Task LoadCurrent_GameNotBegun_IsRefused()
    {
        var gameId = await SeedGameAsync();
        var history = new GameHistory<TestState>(
            fixture.CreateDbContext(),
            NullLogger<GameHistory<TestState>>.Instance
        );

        Assert.Null(await history.LoadCurrent(gameId, CancellationToken.None));
    }

    [Fact]
    public async Task Append_WithoutChoice_StoresNullActorAndAction()
    {
        var run = await BeginRunAsync();

        await run.AppendAsync(CreateStep(1));

        await using var db = fixture.CreateDbContext();
        var step = await db.GameSteps.AsNoTracking().SingleAsync(s => s.GameId == run.GameId);
        Assert.Empty(step.Checkpoints);
        Assert.Null(step.Actor);
        Assert.Null(step.Action);
    }

    [Fact]
    public async Task Append_WithChoice_StoresActorAndAction()
    {
        var run = await BeginRunAsync();

        await run.AppendAsync(CreateStep(1), new PlayerChoice("member-1", "shared.increment"));

        await using var db = fixture.CreateDbContext();
        var step = await db.GameSteps.AsNoTracking().SingleAsync(s => s.GameId == run.GameId);
        Assert.Equal("member-1", step.Actor);
        Assert.Equal("shared.increment", step.Action);
    }

    [Fact]
    public async Task DeleteGame_WithHistory_CascadesToStepsAndSnapshots()
    {
        var run = await BeginRunAsync();
        await run.AppendAsync(CreateStep(1, checkpoint: "mid"));
        await run.AppendPlainAsync(2, 2);

        await using var db = fixture.CreateDbContext();
        await db.Games.Where(g => g.Id == run.GameId).ExecuteDeleteAsync();

        Assert.Empty(await run.GetStepVersionsAsync());
        Assert.Empty(await run.GetSnapshotVersionsAsync());
    }

    [Fact]
    public async Task Append_ConcurrentlyFromSamePrevious_AcceptsExactlyOne()
    {
        var run = await BeginRunAsync();

        var results = await Task.WhenAll(
            Enumerable
                .Range(1, 8)
                .Select(n =>
                    CreateHistory().Append(run.GameId, run.Current, CreateStep(n), choice: null, CancellationToken.None)
                )
        );

        Assert.Single(results, r => r is not null);
        Assert.Equal([1], await run.GetStepVersionsAsync());
    }

    [Fact]
    public async Task Begin_ConcurrentlyOnSameGame_ReturnsTheWinningStateToEveryCaller()
    {
        var gameId = await SeedGameAsync();

        var results = await Task.WhenAll(
            Enumerable.Range(1, 8).Select(n => CreateHistory().Begin(gameId, CreateState(n), CancellationToken.None))
        );

        Assert.All(results, stored => Assert.Equal(results[0], stored));
        await using var db = fixture.CreateDbContext();
        Assert.Single(await db.GameSnapshots.Where(s => s.GameId == gameId).ToListAsync());
        Assert.False(await db.GameSteps.AnyAsync(s => s.GameId == gameId));
    }

    [Fact]
    public async Task Begin_UnknownGame_Throws()
    {
        var history = CreateHistory();

        await Assert.ThrowsAsync<DbUpdateException>(() =>
            history.Begin(Guid.NewGuid(), CreateState(0), CancellationToken.None)
        );
    }

    [Fact]
    public async Task Append_AfterWrite_LeavesContextTrackingNothing()
    {
        var gameId = await SeedGameAsync();
        await using var db = fixture.CreateDbContext();
        var history = new GameHistory<TestState>(db, NullLogger<GameHistory<TestState>>.Instance);
        var begun = await history.Begin(gameId, CreateState(0), CancellationToken.None);

        await history.Append(gameId, begun!, CreateStep(1, checkpoint: "a"), choice: null, CancellationToken.None);

        Assert.Empty(db.ChangeTracker.Entries());
    }
}
