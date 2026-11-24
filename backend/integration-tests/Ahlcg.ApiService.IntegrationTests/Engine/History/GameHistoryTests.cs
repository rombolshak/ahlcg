using System.Text.Json;
using Ahlcg.ApiService.IntegrationTests.Engine.History.Helpers;
using Ahlcg.ApiService.IntegrationTests.Fixture;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using Tablier.Contract;
using Tablier.Engine.History;
using static Ahlcg.ApiService.IntegrationTests.Engine.History.Helpers.TestState;

namespace Ahlcg.ApiService.IntegrationTests.Engine.History;

[Collection(AppCollection.Name)]
public class GameHistoryTests(AppFixture fixture)
{
    [Theory]
    [InlineData(-1)]
    [InlineData(int.MaxValue)]
    public async Task Append_PreviousVersionCannotBeIncremented_ThrowsArgumentOutOfRange(int version)
    {
        var history = HistoryTestSetup.CreateHistory<TestState>(fixture);
        var previous = new StoredState<TestState>(version, CreateState(0));

        var error = await Assert.ThrowsAsync<ArgumentOutOfRangeException>(() =>
            history.Append(Guid.NewGuid(), previous, CreateStep(1), choice: null)
        );

        Assert.Equal("previous", error.ParamName);
    }

    [Fact]
    public async Task Begin_AtVersionZeroWithDifferentInput_ReturnsExactStoredStateWithoutWriting()
    {
        var run = await HistoryTestSetup.Begin(fixture, CreateState);

        var replayed = await run.History.Begin(run.GameId, CreateState(7));

        Assert.Equal(new StoredState<TestState>(0, CreateState(0)), replayed);
        Assert.Equal([0], await run.GetSnapshotVersions());
        Assert.Empty(await run.GetStepVersions());
    }

    [Theory]
    [InlineData(false)]
    [InlineData(true)]
    public async Task Load_NullStoredPatch_ThrowsDescriptiveException(bool historical)
    {
        var run = await HistoryTestSetup.Begin(fixture, CreateState);
        await run.AppendPlain(1, 1);
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

    [Theory]
    [InlineData(false)]
    [InlineData(true)]
    public async Task Load_PatchCannotApply_ThrowsWithPackageError(bool historical)
    {
        var run = await HistoryTestSetup.Begin(fixture, CreateState);
        await run.AppendPlain(1, 1);
        await using var db = fixture.CreateDbContext();
        var step = await db.GameSteps.SingleAsync(s => s.GameId == run.GameId && s.Version == 1);
        step.Patch = JsonDocument.Parse("""[{"op":"replace","path":"/missing-diagnostic-path","value":1}]""");
        await db.SaveChangesAsync();

        var error = await Assert.ThrowsAsync<InvalidOperationException>(async () =>
        {
            if (historical)
                await run.History.LoadAt(run.GameId, 1);
            else
                await run.History.LoadCurrent(run.GameId);
        });

        Assert.Contains(
            $"Step 1 of game {run.GameId} does not apply to the state before it:",
            error.Message,
            StringComparison.Ordinal
        );
        Assert.Contains("/missing-diagnostic-path", error.Message, StringComparison.Ordinal);
    }

    [Fact]
    public async Task LoadCurrent_MalformedStoredPatch_ThrowsWithPatchContextAndInnerException()
    {
        var run = await HistoryTestSetup.Begin(fixture, CreateState);
        await run.AppendPlain(1, 1);
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
        var run = await HistoryTestSetup.Begin(fixture, CreateState);
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
        var run = await HistoryTestSetup.Begin(fixture, CreateState);
        await run.AppendPlain(1, 1);
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
        var run = await HistoryTestSetup.Begin(fixture, CreateState);
        await run.AppendPlain(1, 3);
        await using var db = fixture.CreateDbContext();
        await db.GameSteps.Where(s => s.GameId == run.GameId && s.Version == 2).ExecuteDeleteAsync();

        await Assert.ThrowsAsync<InvalidOperationException>(() => run.History.LoadCurrent(run.GameId));
    }

    [Fact]
    public async Task LoadCurrent_StepsWithoutSnapshot_Throws()
    {
        var run = await HistoryTestSetup.Begin(fixture, CreateState);
        await run.AppendPlain(1, 2);
        await using var db = fixture.CreateDbContext();
        await db.GameSnapshots.Where(s => s.GameId == run.GameId).ExecuteDeleteAsync();

        await Assert.ThrowsAsync<InvalidOperationException>(() => run.History.LoadCurrent(run.GameId));
    }

    [Fact]
    public async Task LoadAt_LatestSnapshotWithoutMatchingStep_ReturnsExactStoredState()
    {
        var run = await HistoryTestSetup.Begin(fixture, CreateState);
        await run.AppendPlain(1, 1);
        await run.Append(CreateStep(2, checkpoint: "latest"));
        await using var db = fixture.CreateDbContext();
        await db.GameSteps.Where(s => s.GameId == run.GameId && s.Version == 2).ExecuteDeleteAsync();

        var loaded = await run.History.LoadAt(run.GameId, 2);

        Assert.Equal(new StoredState<TestState>(2, CreateState(2)), loaded);
    }

    [Fact]
    public async Task LoadAt_ExactSnapshotWithoutStep_ReturnsStoredState()
    {
        var run = await HistoryTestSetup.Begin(fixture, CreateState);
        await run.Append(CreateStep(1, checkpoint: "mid"));
        await run.AppendPlain(2, 3);
        await using var db = fixture.CreateDbContext();
        await db.GameSteps.Where(s => s.GameId == run.GameId && s.Version == 1).ExecuteDeleteAsync();

        var loaded = await run.History.LoadAt(run.GameId, 1, CancellationToken.None);

        Assert.Equal(new StoredState<TestState>(1, CreateState(1)), loaded);
    }

    [Fact]
    public async Task LoadAt_PlainVersionBeforeLaterSteps_ReconstructsOnlyThroughRequestedVersion()
    {
        var run = await HistoryTestSetup.Begin(fixture, CreateState);
        await run.AppendPlain(1, 4);

        var loaded = await run.History.LoadAt(run.GameId, 2, CancellationToken.None);

        Assert.Equal(new StoredState<TestState>(2, CreateState(2)), loaded);
    }

    [Fact]
    public async Task LoadAt_PatchGap_Throws()
    {
        var run = await HistoryTestSetup.Begin(fixture, CreateState);
        await run.AppendPlain(1, 3);
        await using var db = fixture.CreateDbContext();
        await db.GameSteps.Where(s => s.GameId == run.GameId && s.Version == 2).ExecuteDeleteAsync();

        await Assert.ThrowsAsync<InvalidOperationException>(() =>
            run.History.LoadAt(run.GameId, 3, CancellationToken.None)
        );
    }

    [Fact]
    public async Task LoadAt_MissingEarlierSnapshot_Throws()
    {
        var run = await HistoryTestSetup.Begin(fixture, CreateState);
        await run.AppendPlain(1, 2);
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
        var run = await HistoryTestSetup.Begin(fixture, CreateState);
        await run.AppendPlain(1, 2);

        await Assert.ThrowsAsync<ArgumentOutOfRangeException>(() =>
            run.History.LoadAt(run.GameId, version, CancellationToken.None)
        );
    }

    [Fact]
    public async Task LoadAt_UnbegunGame_Throws()
    {
        var gameId = await HistoryTestSetup.SeedGame(fixture);

        await Assert.ThrowsAsync<InvalidOperationException>(() =>
            HistoryTestSetup.CreateHistory<TestState>(fixture).LoadAt(gameId, 0, CancellationToken.None)
        );
    }

    [Fact]
    public async Task Append_MultipleCheckpoints_PreservesEveryTag()
    {
        var run = await HistoryTestSetup.Begin(fixture, CreateState);

        await run.Append(new StepResult<TestState>(CreateState(1), ["turn", "", "phase"]));

        await using var db = fixture.CreateDbContext();
        var step = await db.GameSteps.AsNoTracking().SingleAsync(s => s.GameId == run.GameId);
        Assert.Equal(["turn", "", "phase"], step.Checkpoints);
        Assert.Equal([0, 1], await run.GetSnapshotVersions());
    }

    [Fact]
    public async Task Append_ReservedUndoCheckpoint_ThrowsAndStoresNothing()
    {
        var run = await HistoryTestSetup.Begin(fixture, CreateState);

        await Assert.ThrowsAsync<InvalidOperationException>(() =>
            run.History.Append(
                run.GameId,
                run.Head,
                new StepResult<TestState>(CreateState(1), ["undo"]),
                choice: null,
                CancellationToken.None
            )
        );
        Assert.Empty(await run.GetStepVersions());
        Assert.Equal([0], await run.GetSnapshotVersions());
    }

    [Fact]
    public async Task LoadCurrent_AfterBeginAndAppends_ReturnsLastAppendedState()
    {
        var run = await HistoryTestSetup.Begin(fixture, CreateState);
        await run.AppendPlain(1, 5);

        var loaded = await run.LoadCurrent();

        Assert.Equal(new StoredState<TestState>(5, CreateState(5)), loaded);
    }

    [Fact]
    public async Task LoadCurrent_CheckpointBeforeLaterSteps_EqualsResultWithoutCheckpoint()
    {
        var withCheckpoint = await HistoryTestSetup.Begin(fixture, CreateState);
        await withCheckpoint.AppendPlain(1, 2);
        await withCheckpoint.Append(CreateStep(3, checkpoint: "mid"));
        await withCheckpoint.AppendPlain(4, 6);
        var without = await HistoryTestSetup.Begin(fixture, CreateState);
        await without.AppendPlain(1, 6);

        var loadedWith = await withCheckpoint.LoadCurrent();
        var loadedWithout = await without.LoadCurrent();

        Assert.Equal([0, 3], await withCheckpoint.GetSnapshotVersions());
        Assert.Equal(new StoredState<TestState>(6, CreateState(6)), loadedWith);
        Assert.Equal(loadedWithout, loadedWith);
    }

    [Fact]
    public async Task Append_CheckpointStep_WritesSnapshotEqualToStepState()
    {
        var run = await HistoryTestSetup.Begin(fixture, CreateState);

        await run.Append(CreateStep(1, checkpoint: "mid"));

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
        var run = await HistoryTestSetup.Begin(fixture, CreateState);
        await run.Append(CreateStep(1, checkpoint: "mid"));

        await run.AppendPlain(2, 3);

        Assert.Equal([1, 2, 3], await run.GetStepVersions());
        Assert.Equal([0, 1], await run.GetSnapshotVersions());
    }

    [Fact]
    public async Task Append_EachStep_ReturnsPreviousHeadPlusOne()
    {
        var run = await HistoryTestSetup.Begin(fixture, CreateState);

        var first = await run.History.Append(run.GameId, run.Head, CreateStep(1), choice: null, CancellationToken.None);
        var second = await run.History.Append(run.GameId, first!, CreateStep(2), choice: null, CancellationToken.None);

        Assert.Equal(new StoredState<TestState>(1, CreateState(1)), first);
        Assert.Equal(new StoredState<TestState>(2, CreateState(2)), second);
    }

    [Fact]
    public async Task Append_StalePreviousVersion_IsRefusedAndStoresNothing()
    {
        var run = await HistoryTestSetup.Begin(fixture, CreateState);
        var stale = run.Head;
        await run.AppendPlain(1, 2);

        var refused = await run.History.Append(run.GameId, stale, CreateStep(9), choice: null, CancellationToken.None);

        Assert.Null(refused);
        Assert.Equal([1, 2], await run.GetStepVersions());
        Assert.Equal([0], await run.GetSnapshotVersions());
    }

    [Fact]
    public async Task Append_GameNotBegun_Throws()
    {
        var gameId = await HistoryTestSetup.SeedGame(fixture);
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
        var run = await HistoryTestSetup.Begin(fixture, CreateState);
        await run.AppendPlain(1, 2);

        var conflict = await Assert.ThrowsAsync<GameHistoryConflictException>(() =>
            run.History.Begin(run.GameId, CreateState(7))
        );

        Assert.Equal(run.GameId, conflict.GameId);
        Assert.Equal(2, conflict.Version);
        Assert.Equal(new StoredState<TestState>(2, CreateState(2)), await run.LoadCurrent());
    }

    [Fact]
    public async Task Append_BaselineStep_WritesSnapshotAndDeletesNothing()
    {
        var run = await HistoryTestSetup.Begin(fixture, CreateState);
        await run.AppendPlain(1, 1);
        await run.Append(CreateStep(2, checkpoint: "a"));

        await run.Append(CreateStep(3, baseline: true));
        await run.AppendPlain(4, 5);

        Assert.Equal([1, 2, 3, 4, 5], await run.GetStepVersions());
        Assert.Equal([0, 2, 3], await run.GetSnapshotVersions());
        Assert.Equal(new StoredState<TestState>(5, CreateState(5)), await run.LoadCurrent());
    }

    [Fact]
    public async Task Append_IrreversibleStep_DeletesNothingAndLoadsCurrent()
    {
        var run = await HistoryTestSetup.Begin(fixture, CreateState);
        await run.Append(CreateStep(1, checkpoint: "a"));
        await run.AppendPlain(2, 2);

        await run.Append(CreateStep(3, irreversible: true));
        await run.AppendPlain(4, 4);

        Assert.Equal([1, 2, 3, 4], await run.GetStepVersions());
        Assert.Equal([0, 1, 3], await run.GetSnapshotVersions());
        Assert.Equal(new StoredState<TestState>(4, CreateState(4)), await run.LoadCurrent());
    }

    [Fact]
    public async Task Append_PastStateAsIrreversibleCheckpoint_RewindsCurrentAndBarsWhatCameBefore()
    {
        var run = await HistoryTestSetup.Begin(fixture, CreateState);
        await run.Append(CreateStep(1, checkpoint: "turn"));
        await run.AppendPlain(2, 3);
        var target = await run.History.LoadAt(run.GameId, 1, CancellationToken.None);

        await run.Append(new StepResult<TestState>(target!.State, ["turn"], IsIrreversible: true));

        Assert.Equal(new StoredState<TestState>(4, CreateState(1)), await run.LoadCurrent());
        Assert.Equal(
            new StoredState<TestState>(4, CreateState(1)),
            await run.History.LoadAt(run.GameId, 4, CancellationToken.None)
        );
        await Assert.ThrowsAsync<InvalidOperationException>(() => run.History.LoadAt(run.GameId, 1));
    }

    [Fact]
    public async Task LoadAt_CheckpointBeforeIrreversibleStep_IsRefused()
    {
        var run = await HistoryTestSetup.Begin(fixture, CreateState);
        await run.Append(CreateStep(1, checkpoint: "a"));
        await run.Append(CreateStep(2, irreversible: true));

        await Assert.ThrowsAsync<InvalidOperationException>(() => run.History.LoadAt(run.GameId, 0));
        await Assert.ThrowsAsync<InvalidOperationException>(() => run.History.LoadAt(run.GameId, 1));
    }

    [Fact]
    public async Task LoadAt_IrreversibleCheckpointVersion_ReturnsItsState()
    {
        var run = await HistoryTestSetup.Begin(fixture, CreateState);
        await run.Append(CreateStep(1, checkpoint: "reveal", irreversible: true));
        await run.AppendPlain(2, 2);

        Assert.Equal(
            new StoredState<TestState>(1, CreateState(1)),
            await run.History.LoadAt(run.GameId, 1, CancellationToken.None)
        );
    }

    [Fact]
    public async Task LoadAt_SnapshotBelowBaseline_IsRefused()
    {
        var run = await HistoryTestSetup.Begin(fixture, CreateState);
        await run.Append(CreateStep(1, checkpoint: "a"));
        await run.Append(CreateStep(2, baseline: true));

        await Assert.ThrowsAsync<InvalidOperationException>(() => run.History.LoadAt(run.GameId, 1));
        Assert.Equal(
            new StoredState<TestState>(2, CreateState(2)),
            await run.History.LoadAt(run.GameId, 2, CancellationToken.None)
        );
    }

    [Fact]
    public async Task LoadAt_CheckpointVersionAndZero_ReturnsSnapshotState()
    {
        var run = await HistoryTestSetup.Begin(fixture, CreateState);
        await run.AppendPlain(1, 1);
        await run.Append(CreateStep(2, checkpoint: "mid"));
        await run.AppendPlain(3, 3);

        var atZero = await run.History.LoadAt(run.GameId, 0, CancellationToken.None);
        var atCheckpoint = await run.History.LoadAt(run.GameId, 2, CancellationToken.None);

        Assert.Equal(new StoredState<TestState>(0, CreateState(0)), atZero);
        Assert.Equal(new StoredState<TestState>(2, CreateState(2)), atCheckpoint);
    }

    [Fact]
    public async Task LoadAt_VersionWithoutSnapshot_ReconstructsFromEarlierSnapshot()
    {
        var run = await HistoryTestSetup.Begin(fixture, CreateState);
        await run.Append(CreateStep(1, checkpoint: "mid"));
        await run.AppendPlain(2, 3);

        Assert.Equal(
            new StoredState<TestState>(3, CreateState(3)),
            await run.History.LoadAt(run.GameId, 3, CancellationToken.None)
        );
        await Assert.ThrowsAsync<ArgumentOutOfRangeException>(() => run.History.LoadAt(run.GameId, 99));
    }

    [Fact]
    public async Task LoadCurrent_GameNotBegun_IsRefused()
    {
        var gameId = await HistoryTestSetup.SeedGame(fixture);
        var history = new GameHistory<TestState>(
            fixture.CreateDbContext(),
            NullLogger<GameHistory<TestState>>.Instance
        );

        Assert.Null(await history.LoadCurrent(gameId, CancellationToken.None));
    }

    [Fact]
    public async Task Append_WithoutChoice_StoresNullActorAndAction()
    {
        var run = await HistoryTestSetup.Begin(fixture, CreateState);

        await run.Append(CreateStep(1));

        await using var db = fixture.CreateDbContext();
        var step = await db.GameSteps.AsNoTracking().SingleAsync(s => s.GameId == run.GameId);
        Assert.Empty(step.Checkpoints);
        Assert.Null(step.Actor);
        Assert.Null(step.Action);
    }

    [Fact]
    public async Task Append_WithChoice_StoresActorAndAction()
    {
        var run = await HistoryTestSetup.Begin(fixture, CreateState);

        await run.Append(CreateStep(1), new PlayerChoice("member-1", "shared.increment"));

        await using var db = fixture.CreateDbContext();
        var step = await db.GameSteps.AsNoTracking().SingleAsync(s => s.GameId == run.GameId);
        Assert.Equal("member-1", step.Actor);
        Assert.Equal("shared.increment", step.Action);
    }

    [Fact]
    public async Task DeleteGame_WithHistory_CascadesToStepsAndSnapshots()
    {
        var run = await HistoryTestSetup.Begin(fixture, CreateState);
        await run.Append(CreateStep(1, checkpoint: "mid"));
        await run.AppendPlain(2, 2);

        await using var db = fixture.CreateDbContext();
        await db.Games.Where(g => g.Id == run.GameId).ExecuteDeleteAsync();

        Assert.Empty(await run.GetStepVersions());
        Assert.Empty(await run.GetSnapshotVersions());
    }

    [Fact]
    public async Task Append_ConcurrentlyFromSamePrevious_AcceptsExactlyOne()
    {
        var run = await HistoryTestSetup.Begin(fixture, CreateState);

        var results = await Task.WhenAll(
            Enumerable
                .Range(1, 8)
                .Select(n =>
                    HistoryTestSetup
                        .CreateHistory<TestState>(fixture)
                        .Append(run.GameId, run.Head, CreateStep(n), choice: null, CancellationToken.None)
                )
        );

        Assert.Single(results, r => r is not null);
        Assert.Equal([1], await run.GetStepVersions());
    }

    [Fact]
    public async Task Begin_ConcurrentlyOnSameGame_ReturnsTheWinningStateToEveryCaller()
    {
        var gameId = await HistoryTestSetup.SeedGame(fixture);

        var results = await Task.WhenAll(
            Enumerable
                .Range(1, 8)
                .Select(n =>
                    HistoryTestSetup
                        .CreateHistory<TestState>(fixture)
                        .Begin(gameId, CreateState(n), CancellationToken.None)
                )
        );

        Assert.All(results, stored => Assert.Equal(results[0], stored));
        await using var db = fixture.CreateDbContext();
        Assert.Single(await db.GameSnapshots.Where(s => s.GameId == gameId).ToListAsync());
        Assert.False(await db.GameSteps.AnyAsync(s => s.GameId == gameId));
    }

    [Fact]
    public async Task Begin_UnknownGame_Throws()
    {
        var history = HistoryTestSetup.CreateHistory<TestState>(fixture);

        await Assert.ThrowsAsync<DbUpdateException>(() =>
            history.Begin(Guid.NewGuid(), CreateState(0), CancellationToken.None)
        );
    }

    [Fact]
    public async Task Append_AfterWrite_LeavesContextTrackingNothing()
    {
        var gameId = await HistoryTestSetup.SeedGame(fixture);
        await using var db = fixture.CreateDbContext();
        var history = new GameHistory<TestState>(db, NullLogger<GameHistory<TestState>>.Instance);
        var begun = await history.Begin(gameId, CreateState(0), CancellationToken.None);

        await history.Append(gameId, begun!, CreateStep(1, checkpoint: "a"), choice: null, CancellationToken.None);

        Assert.Empty(db.ChangeTracker.Entries());
    }
}
