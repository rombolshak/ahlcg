using System.Diagnostics.Metrics;
using System.Text.Json;
using Ahlcg.ApiService.IntegrationTests.Engine.History.Helpers;
using Ahlcg.ApiService.IntegrationTests.Fixture;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using StackExchange.Redis;
using Tablier.Contract;
using Tablier.Engine.History;
using Tablier.Engine.History.Cache;
using Tablier.Engine.History.Live;
using Tablier.Telemetry;
using static Ahlcg.ApiService.IntegrationTests.Engine.History.Helpers.TestState;

namespace Ahlcg.ApiService.IntegrationTests.Engine.History;

[Collection(AppCollection.Name)]
public class CachedGameHistoryTests(AppFixture fixture)
{
    [Fact]
    public async Task Rewind_StaleCachedHeadAfterCommittedStoreRewind_RefreshesCacheAndPreservesConflict()
    {
        var gameId = await HistoryTestSetup.SeedGame(fixture);
        var run = CreateRun(gameId);
        var game = await HistoryTestSetup.Begin(fixture, CreateCacheState, history: run.Cached, gameId: gameId);
        await game.Append(1);
        await game.Append(2);
        var head = game.Head;
        var restored = await run.Store.Rewind(gameId, head.Version, 1);
        Assert.Equal(head, await run.Cached.LoadCurrent(gameId));

        var error = await Assert.ThrowsAsync<GameHistoryRewindConflictException>(() =>
            run.Cached.Rewind(gameId, head.Version, 1)
        );
        await DeleteGameAsync(gameId);
        var cached = await run.Cached.LoadCurrent(gameId);

        Assert.Equal(gameId, error.GameId);
        Assert.Equal(head.Version, error.ExpectedVersion);
        Assert.Contains("Reload current history", error.Message, StringComparison.Ordinal);
        Assert.Equal(restored, cached);
    }

    [Fact]
    public async Task Rewind_CommittedState_WritesRestoredStateAtNewVersionToCache()
    {
        var gameId = await HistoryTestSetup.SeedGame(fixture);
        var run = CreateRun(gameId);
        var game = await HistoryTestSetup.Begin(fixture, CreateCacheState, history: run.Cached, gameId: gameId);
        await game.Append(1);
        await game.Append(2);
        var head = game.Head;

        var restored = await run.Cached.Rewind(gameId, head.Version, 1);
        await DeleteGameAsync(gameId);
        var cached = await run.Cached.LoadCurrent(gameId, CancellationToken.None);

        Assert.Equal(new StoredState<TestState>(3, CreateCacheState(1)), restored);
        Assert.Equal(restored, cached);
        await Assert.ThrowsAsync<InvalidOperationException>(() => run.Cached.GetHistorySummary(gameId, 3));
        await Assert.ThrowsAsync<InvalidOperationException>(() => run.Cached.GetActorsForRange(gameId, 0, 3));
    }

    [Fact]
    public async Task Rewind_CacheAlreadyHoldsNewerState_DoesNotRegressCachedVersion()
    {
        var gameId = await HistoryTestSetup.SeedGame(fixture);
        var run = CreateRun(gameId);
        var game = await HistoryTestSetup.Begin(fixture, CreateCacheState, history: run.Store, gameId: gameId);
        await game.Append(1);
        await game.Append(2);
        var head = game.Head;
        await run
            .Redis.GetDatabase()
            .HashSetAsync(
                CacheKeys.GetGameStateKey(gameId),
                [new HashEntry("version", "5"), new HashEntry("state", JsonSerializer.Serialize(CreateCacheState(5)))]
            );

        var restored = await run.Cached.Rewind(gameId, head.Version, 1);
        var cached = await run.Cached.LoadCurrent(gameId, CancellationToken.None);

        Assert.Equal(new StoredState<TestState>(3, CreateCacheState(1)), restored);
        Assert.Equal(new StoredState<TestState>(5, CreateCacheState(5)), cached);
    }

    [Theory]
    [InlineData(false)]
    [InlineData(true)]
    public async Task Begin_VersionZeroReplay_ReturnsStoredStateAndRepopulatesLostCache(bool loseCache)
    {
        var gameId = await HistoryTestSetup.SeedGame(fixture);
        var run = CreateRun(gameId);
        await run.Cached.Begin(gameId, CreateCacheState(0));
        if (loseCache)
            await run.Redis.GetDatabase().KeyDeleteAsync(CacheKeys.GetGameStateKey(gameId));

        var replayed = await run.Cached.Begin(gameId, CreateCacheState(9));
        await DeleteGameAsync(gameId);
        var cached = await run.Cached.LoadCurrent(gameId);

        Assert.Equal(new StoredState<TestState>(0, CreateCacheState(0)), replayed);
        Assert.Equal(replayed, cached);
    }

    [Fact]
    public async Task Begin_WhenCacheHoldsNewerVersion_LeavesTheNewerOne()
    {
        var gameId = await HistoryTestSetup.SeedGame(fixture);
        var run = CreateRun(gameId);
        await run
            .Redis.GetDatabase()
            .HashSetAsync(
                CacheKeys.GetGameStateKey(gameId),
                [new HashEntry("version", "5"), new HashEntry("state", JsonSerializer.Serialize(CreateCacheState(5)))]
            );

        await run.Cached.Begin(gameId, CreateCacheState(0), CancellationToken.None);
        await DeleteGameAsync(gameId);
        var loaded = await run.Cached.LoadCurrent(gameId, CancellationToken.None);

        Assert.Equal(new StoredState<TestState>(5, CreateCacheState(5)), loaded);
    }

    [Fact]
    public async Task LoadCurrent_AfterAppend_ReturnsNewHeadFromCacheWhenStoreIsGone()
    {
        var gameId = await HistoryTestSetup.SeedGame(fixture);
        var run = CreateRun(gameId);
        var begun = await run.Cached.Begin(gameId, CreateCacheState(0), CancellationToken.None);
        await run.Cached.Append(gameId, begun!, CreateCacheStep(1), choice: null, CancellationToken.None);
        await DeleteGameAsync(gameId);

        var loaded = await run.Cached.LoadCurrent(gameId, CancellationToken.None);

        Assert.Equal(new StoredState<TestState>(1, CreateCacheState(1)), loaded);
    }

    [Fact]
    public async Task LoadCurrent_AfterBegin_ReturnsInitialStateFromCacheWhenStoreIsGone()
    {
        var gameId = await HistoryTestSetup.SeedGame(fixture);
        var run = CreateRun(gameId);
        await run.Cached.Begin(gameId, CreateCacheState(0), CancellationToken.None);
        await DeleteGameAsync(gameId);

        var loaded = await run.Cached.LoadCurrent(gameId, CancellationToken.None);

        Assert.Equal(new StoredState<TestState>(0, CreateCacheState(0)), loaded);
    }

    [Fact]
    public async Task Append_Refused_RefreshesCacheFromStore()
    {
        var gameId = await HistoryTestSetup.SeedGame(fixture);
        var run = CreateRun(gameId);
        var begun = await run.Cached.Begin(gameId, CreateCacheState(0), CancellationToken.None);
        await run.Store.Append(gameId, begun!, CreateCacheStep(1), choice: null, CancellationToken.None);

        var refused = await run.Cached.Append(gameId, begun!, CreateCacheStep(9), choice: null, CancellationToken.None);
        await DeleteGameAsync(gameId);
        var loaded = await run.Cached.LoadCurrent(gameId, CancellationToken.None);

        Assert.Null(refused);
        Assert.Equal(new StoredState<TestState>(1, CreateCacheState(1)), loaded);
    }

    [Fact]
    public async Task LoadCurrent_MissFinishingAfterRefusedAppend_DoesNotRegressCachedHead()
    {
        var gameId = await HistoryTestSetup.SeedGame(fixture);
        var run = CreateRun(gameId);
        var begun = await run.Cached.Begin(gameId, CreateCacheState(0), CancellationToken.None);
        await run.Redis.GetDatabase().KeyDeleteAsync(CacheKeys.GetGameStateKey(gameId));
        var pausing = new PausingLoads(HistoryTestSetup.CreateHistory<TestState>(fixture));
        var slowMiss = CreateCached(pausing, run.Redis).LoadCurrent(gameId, CancellationToken.None);
        await pausing.Loaded.Task;

        await run.Cached.Append(gameId, begun!, CreateCacheStep(1), choice: null, CancellationToken.None);
        await run.Cached.Append(gameId, begun!, CreateCacheStep(9), choice: null, CancellationToken.None);
        pausing.Resume.SetResult();
        await slowMiss;
        await DeleteGameAsync(gameId);
        var loaded = await run.Cached.LoadCurrent(gameId, CancellationToken.None);

        Assert.Equal(new StoredState<TestState>(1, CreateCacheState(1)), loaded);
    }

    [Fact]
    public async Task LoadCurrent_GameNotBegun_ReturnsNullAndDoesNotCacheIt()
    {
        var gameId = await HistoryTestSetup.SeedGame(fixture);
        var run = CreateRun(gameId);

        var beforeBegin = await run.Cached.LoadCurrent(gameId, CancellationToken.None);
        await run.Store.Begin(gameId, CreateCacheState(0), CancellationToken.None);
        var afterBegin = await run.Cached.LoadCurrent(gameId, CancellationToken.None);

        Assert.Null(beforeBegin);
        Assert.Equal(new StoredState<TestState>(0, CreateCacheState(0)), afterBegin);
    }

    [Fact]
    public async Task LoadAt_PassesThroughToStore()
    {
        var gameId = await HistoryTestSetup.SeedGame(fixture);
        var run = CreateRun(gameId);
        await run.Cached.Begin(gameId, CreateCacheState(0), CancellationToken.None);

        var loaded = await run.Cached.LoadAt(gameId, 0, CancellationToken.None);

        Assert.Equal(new StoredState<TestState>(0, CreateCacheState(0)), loaded);
    }

    private sealed record Run(
        Guid GameId,
        GameHistory<TestState> Store,
        CachedGameHistory<TestState> Cached,
        IConnectionMultiplexer Redis
    );

    private sealed class PausingLoads(IGameHistory<TestState> inner) : IGameHistory<TestState>
    {
        public TaskCompletionSource Loaded { get; } = new(TaskCreationOptions.RunContinuationsAsynchronously);

        public TaskCompletionSource Resume { get; } = new(TaskCreationOptions.RunContinuationsAsynchronously);

        public Task<StoredState<TestState>> Begin(Guid gameId, TestState initial, CancellationToken ct = default) =>
            inner.Begin(gameId, initial, ct);

        public Task<StoredState<TestState>?> Append(
            Guid gameId,
            StoredState<TestState> previous,
            StepResult<TestState> result,
            PlayerChoice? choice,
            CancellationToken ct = default
        ) => inner.Append(gameId, previous, result, choice, ct);

        public Task<StoredState<TestState>> Rewind(
            Guid gameId,
            int expectedVersion,
            int targetVersion,
            CancellationToken ct = default
        ) => inner.Rewind(gameId, expectedVersion, targetVersion, ct);

        public Task<HistorySummary> GetHistorySummary(Guid gameId, int version, CancellationToken ct = default) =>
            inner.GetHistorySummary(gameId, version, ct);

        public Task<IReadOnlySet<string>> GetActorsForRange(
            Guid gameId,
            int lowerExclusiveVersion,
            int upperInclusiveVersion,
            CancellationToken ct = default
        ) => inner.GetActorsForRange(gameId, lowerExclusiveVersion, upperInclusiveVersion, ct);

        public async Task<StoredState<TestState>?> LoadCurrent(Guid gameId, CancellationToken ct = default)
        {
            var loaded = await inner.LoadCurrent(gameId, ct);
            Loaded.SetResult();
            await Resume.Task;
            return loaded;
        }

        public Task<StoredState<TestState>> LoadAt(Guid gameId, int version, CancellationToken ct = default) =>
            inner.LoadAt(gameId, version, ct);
    }

    private Run CreateRun(Guid gameId)
    {
        var redis = ConnectionMultiplexer.Connect(fixture.CacheConnectionString);
        return new Run(
            gameId,
            HistoryTestSetup.CreateHistory<TestState>(fixture),
            CreateCached(HistoryTestSetup.CreateHistory<TestState>(fixture), redis),
            redis
        );
    }

    private static CachedGameHistory<TestState> CreateCached(
        IGameHistory<TestState> inner,
        IConnectionMultiplexer redis
    ) =>
        new(
            inner,
            redis,
            Options.Create(new GameHistoryCacheOptions()),
            new TablierMetrics(
                new ServiceCollection().AddMetrics().BuildServiceProvider().GetRequiredService<IMeterFactory>()
            ),
            NullLogger<CachedGameHistory<TestState>>.Instance
        );

    private async Task DeleteGameAsync(Guid gameId)
    {
        await using var db = fixture.CreateDbContext();
        await db.Games.Where(g => g.Id == gameId).ExecuteDeleteAsync();
    }
}
