using Ahlcg.ApiService.IntegrationTests.Engine.History.Helpers;
using Ahlcg.ApiService.IntegrationTests.Fixture;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Logging.Testing;
using Tablier.Engine.History;
using Tablier.Engine.History.Cleanup;
using static Ahlcg.ApiService.IntegrationTests.Engine.History.Helpers.TestState;

namespace Ahlcg.ApiService.IntegrationTests.Engine.History;

[Collection(AppCollection.Name)]
public class GameHistoryCleanupTests(AppFixture fixture)
{
    [Fact]
    public async Task Run_BaselineThenCheckpointsThenIrreversibleWithoutCheckpoint_KeepsBaselineAndNewestSnapshots()
    {
        var game = await PlayBaselineThenCheckpointsThenIrreversible(
            await HistoryTestSetup.Begin(fixture, CreateState)
        );

        var result = await CreateCleanup().Run(CancellationToken.None);

        Assert.NotNull(result);
        Assert.Equal([3, 4, 5, 6, 7], await game.GetStepVersions());
        Assert.Equal([3, 6], await game.GetSnapshotVersions());
    }

    [Fact]
    public async Task Run_BaselineThenIrreversibleWithCheckpoint_KeepsBaselineAndIrreversibleSnapshots()
    {
        var game = await PlayBaselineThenIrreversibleWithCheckpoint(await HistoryTestSetup.Begin(fixture, CreateState));

        await CreateCleanup().Run(CancellationToken.None);

        Assert.Equal([2, 3, 4, 5, 6], await game.GetStepVersions());
        Assert.Equal([2, 5], await game.GetSnapshotVersions());
    }

    [Fact]
    public async Task Run_IrreversibleBeforeBaseline_KeepsOnlyBaselineSnapshot()
    {
        var game = await PlayIrreversibleThenBaseline(await HistoryTestSetup.Begin(fixture, CreateState));

        await CreateCleanup().Run(CancellationToken.None);

        Assert.Equal([5, 6], await game.GetStepVersions());
        Assert.Equal([5], await game.GetSnapshotVersions());
    }

    [Fact]
    public async Task Run_NoBaselineAndNoIrreversible_DeletesNothing()
    {
        var game = await HistoryTestSetup.Begin(fixture, CreateState);
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
            1 => await PlayBaselineThenCheckpointsThenIrreversible(await HistoryTestSetup.Begin(fixture, CreateState)),
            2 => await PlayBaselineThenIrreversibleWithCheckpoint(await HistoryTestSetup.Begin(fixture, CreateState)),
            _ => await PlayIrreversibleThenBaseline(await HistoryTestSetup.Begin(fixture, CreateState)),
        };
        var before = await game.LoadEverything();

        await CreateCleanup().Run(CancellationToken.None);

        Assert.Equal(before, await game.LoadEverything());
    }

    [Fact]
    public async Task Run_AnotherRunHoldsTheLock_SkipsAndDeletesNothing()
    {
        var game = await PlayBaselineThenCheckpointsThenIrreversible(
            await HistoryTestSetup.Begin(fixture, CreateState)
        );
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
        var game = await HistoryTestSetup.Begin(fixture, CreateState);
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
            await game.Append(
                CreateStep(n, checkpoint: n % 5 == 0 ? "c" : null, baseline: isBaseline),
                ct: CancellationToken.None
            );
            if (isBaseline)
                latestBaseline = n;
        }

        await done.CancelAsync();
        await Task.WhenAll(cleaners);
        await CreateCleanup().Run(CancellationToken.None);

        Assert.Equal(
            Enumerable.Range(latestBaseline, steps - latestBaseline + 1),
            await game.GetStepVersions(CancellationToken.None)
        );
        var history = new GameHistory<TestState>(
            fixture.CreateDbContext(),
            NullLogger<GameHistory<TestState>>.Instance
        );
        Assert.Equal(
            new StoredState<TestState>(steps, CreateState(steps)),
            await history.LoadCurrent(game.GameId, CancellationToken.None)
        );
    }

    private GameHistoryCleanup CreateCleanup(FakeLogger<GameHistoryCleanup>? logger = null) =>
        new(fixture.CreateDbContext(), logger ?? new FakeLogger<GameHistoryCleanup>());

    private static async Task<HistoryTestCase<TestState>> PlayBaselineThenCheckpointsThenIrreversible(
        HistoryTestCase<TestState> game,
        CancellationToken ct = default
    )
    {
        await game.Append(CreateStep(1), ct: ct);
        await game.Append(CreateStep(2), ct: ct);
        await game.Append(CreateStep(3, baseline: true), ct: ct);
        await game.Append(CreateStep(4, checkpoint: "a"), ct: ct);
        await game.Append(CreateStep(5, checkpoint: "b"), ct: ct);
        await game.Append(CreateStep(6, irreversible: true), ct: ct);
        await game.Append(CreateStep(7), ct: ct);
        return game;
    }

    private static async Task<HistoryTestCase<TestState>> PlayBaselineThenIrreversibleWithCheckpoint(
        HistoryTestCase<TestState> game,
        CancellationToken ct = default
    )
    {
        await game.Append(CreateStep(1), ct: ct);
        await game.Append(CreateStep(2, baseline: true), ct: ct);
        await game.Append(CreateStep(3, checkpoint: "a"), ct: ct);
        await game.Append(CreateStep(4), ct: ct);
        await game.Append(CreateStep(5, checkpoint: "b", irreversible: true), ct: ct);
        await game.Append(CreateStep(6), ct: ct);
        return game;
    }

    private static async Task<HistoryTestCase<TestState>> PlayIrreversibleThenBaseline(
        HistoryTestCase<TestState> game,
        CancellationToken ct = default
    )
    {
        await game.Append(CreateStep(1), ct: ct);
        await game.Append(CreateStep(2, checkpoint: "a", irreversible: true), ct: ct);
        await game.Append(CreateStep(3, checkpoint: "b"), ct: ct);
        await game.Append(CreateStep(4), ct: ct);
        await game.Append(CreateStep(5, baseline: true), ct: ct);
        await game.Append(CreateStep(6), ct: ct);
        return game;
    }
}
