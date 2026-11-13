using System.Diagnostics.Metrics;
using System.Globalization;
using System.Text.Json;
using Ahlcg.ApiService.IntegrationTests.Fixture;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using StackExchange.Redis;
using Tablier.Contract;
using Tablier.Engine.History;
using Tablier.Engine.History.Cache;
using Tablier.Engine.History.Rewind;
using Tablier.Telemetry;

namespace Ahlcg.ApiService.IntegrationTests.Engine.History;

[Collection(AppCollection.Name)]
public class CachedGameHistoryTests(AppFixture fixture)
{
    [Fact]
    public async Task Begin_WhenCacheHoldsNewerVersion_LeavesTheNewerOne()
    {
        var gameId = await HistoryTestData.SeedGame(fixture);
        var context = CreateCachedHistoryTestContext(gameId);
        await context
            .Redis.GetDatabase()
            .HashSetAsync(
                CacheKeys.GetGameStateKey(gameId),
                [new HashEntry("version", "5"), new HashEntry("state", JsonSerializer.Serialize(CreateState(5)))]
            );

        await context.Cached.Begin(gameId, CreateState(0), CancellationToken.None);
        await DeletePersistedGame(gameId);
        var loaded = await context.Cached.LoadCurrent(gameId, CancellationToken.None);

        Assert.Equal(new StoredState<TestState>(5, CreateState(5)), loaded);
    }

    [Fact]
    public async Task LoadCurrent_AfterAppend_ReturnsNewHeadFromCacheWhenStoreIsGone()
    {
        var gameId = await HistoryTestData.SeedGame(fixture);
        var context = CreateCachedHistoryTestContext(gameId);
        var begun = await context.Cached.Begin(gameId, CreateState(0), CancellationToken.None);
        await context.Cached.Append(gameId, begun!, CreateStep(1), choice: null, CancellationToken.None);
        await DeletePersistedGame(gameId);

        var loaded = await context.Cached.LoadCurrent(gameId, CancellationToken.None);

        Assert.Equal(new StoredState<TestState>(1, CreateState(1)), loaded);
    }

    [Fact]
    public async Task LoadCurrent_AfterBegin_ReturnsInitialStateFromCacheWhenStoreIsGone()
    {
        var gameId = await HistoryTestData.SeedGame(fixture);
        var context = CreateCachedHistoryTestContext(gameId);
        await context.Cached.Begin(gameId, CreateState(0), CancellationToken.None);
        await DeletePersistedGame(gameId);

        var loaded = await context.Cached.LoadCurrent(gameId, CancellationToken.None);

        Assert.Equal(new StoredState<TestState>(0, CreateState(0)), loaded);
    }

    [Fact]
    public async Task Append_Refused_RefreshesCacheFromStore()
    {
        var gameId = await HistoryTestData.SeedGame(fixture);
        var context = CreateCachedHistoryTestContext(gameId);
        var begun = await context.Cached.Begin(gameId, CreateState(0), CancellationToken.None);
        await context.Store.Append(gameId, begun!, CreateStep(1), choice: null, CancellationToken.None);

        var refused = await context.Cached.Append(gameId, begun!, CreateStep(9), choice: null, CancellationToken.None);
        await DeletePersistedGame(gameId);
        var loaded = await context.Cached.LoadCurrent(gameId, CancellationToken.None);

        Assert.Null(refused);
        Assert.Equal(new StoredState<TestState>(1, CreateState(1)), loaded);
    }

    [Fact]
    public async Task LoadCurrent_MissFinishingAfterRefusedAppend_DoesNotRegressCachedHead()
    {
        var gameId = await HistoryTestData.SeedGame(fixture);
        var context = CreateCachedHistoryTestContext(gameId);
        var begun = await context.Cached.Begin(gameId, CreateState(0), CancellationToken.None);
        await context.Redis.GetDatabase().KeyDeleteAsync(CacheKeys.GetGameStateKey(gameId));
        var pausingHistory = new LoadCurrentPausingHistory(CreateStore());
        var slowMiss = CreateCached(pausingHistory, context.Redis).LoadCurrent(gameId, CancellationToken.None);
        await pausingHistory.Loaded.Task;

        await context.Cached.Append(gameId, begun!, CreateStep(1), choice: null, CancellationToken.None);
        await context.Cached.Append(gameId, begun!, CreateStep(9), choice: null, CancellationToken.None);
        pausingHistory.Resume.SetResult();
        await slowMiss;
        await DeletePersistedGame(gameId);
        var loaded = await context.Cached.LoadCurrent(gameId, CancellationToken.None);

        Assert.Equal(new StoredState<TestState>(1, CreateState(1)), loaded);
    }

    [Fact]
    public async Task LoadCurrent_GameNotBegun_ReturnsNullAndDoesNotCacheIt()
    {
        var gameId = await HistoryTestData.SeedGame(fixture);
        var context = CreateCachedHistoryTestContext(gameId);

        var beforeBegin = await context.Cached.LoadCurrent(gameId, CancellationToken.None);
        await context.Store.Begin(gameId, CreateState(0), CancellationToken.None);
        var afterBegin = await context.Cached.LoadCurrent(gameId, CancellationToken.None);

        Assert.Null(beforeBegin);
        Assert.Equal(new StoredState<TestState>(0, CreateState(0)), afterBegin);
    }

    [Fact]
    public async Task LoadAt_PassesThroughToStore()
    {
        var gameId = await HistoryTestData.SeedGame(fixture);
        var context = CreateCachedHistoryTestContext(gameId);
        await context.Cached.Begin(gameId, CreateState(0), CancellationToken.None);

        var loaded = await context.Cached.LoadAt(gameId, 0, CancellationToken.None);

        Assert.Equal(new StoredState<TestState>(0, CreateState(0)), loaded);
    }

    [Fact]
    public async Task Rewind_CommittedState_IsAvailableFromCache()
    {
        var gameId = await HistoryTestData.SeedGame(fixture);
        var context = CreateCachedHistoryTestContext(gameId);
        var begun = await context.Cached.Begin(gameId, CreateState(0));
        var one = await context.Cached.Append(gameId, begun!, CreateStep(1), choice: null);
        var two = await context.Cached.Append(gameId, one!, CreateStep(2), choice: null);

        var restored = await context.Cached.Rewind(gameId, two!, 1);
        await DeletePersistedGame(gameId);

        Assert.Equal(new StoredState<TestState>(3, CreateState(1)), restored);
        Assert.Equal(restored, await context.Cached.LoadCurrent(gameId));
    }

    [Fact]
    public async Task Rewind_StaleSource_RefreshesCacheWhenStoreIsGone()
    {
        var gameId = await HistoryTestData.SeedGame(fixture);
        var context = CreateCachedHistoryTestContext(gameId);
        var begun = await context.Cached.Begin(gameId, CreateState(0));
        var one = await context.Cached.Append(gameId, begun!, CreateStep(1), choice: null);
        var two = await context.Cached.Append(gameId, one!, CreateStep(2), choice: null);
        var three = await context.Store.Append(gameId, two!, CreateStep(3), choice: null);
        Assert.Equal(new StoredState<TestState>(3, CreateState(3)), three);

        var refused = await context.Cached.Rewind(gameId, two!, 1);
        await DeletePersistedGame(gameId);

        Assert.Null(refused);
        Assert.Equal(three, await context.Cached.LoadCurrent(gameId));
    }

    [Fact]
    public async Task Rewind_SuccessfulWithNewerCachedVersion_PreservesCachedHead()
    {
        var gameId = await HistoryTestData.SeedGame(fixture);
        var context = CreateCachedHistoryTestContext(gameId);
        var begun = await context.Cached.Begin(gameId, CreateState(0));
        var one = await context.Cached.Append(gameId, begun!, CreateStep(1), choice: null);
        var two = await context.Cached.Append(gameId, one!, CreateStep(2), choice: null);
        await context
            .Redis.GetDatabase()
            .HashSetAsync(
                CacheKeys.GetGameStateKey(gameId),
                [new HashEntry("version", "5"), new HashEntry("state", JsonSerializer.Serialize(CreateState(5)))]
            );

        var restored = await context.Cached.Rewind(gameId, two!, 1);
        await DeletePersistedGame(gameId);

        Assert.Equal(new StoredState<TestState>(3, CreateState(1)), restored);
        Assert.Equal(new StoredState<TestState>(5, CreateState(5)), await context.Cached.LoadCurrent(gameId));
    }

    private sealed record TestState(int Counter, string Label) : ISchemaVersioned
    {
        public int SchemaVersion => 1;
    }

    private static TestState CreateState(int n) => new(n, string.Create(CultureInfo.InvariantCulture, $"state {n}"));

    private static StepResult<TestState> CreateStep(int n) => new(CreateState(n));

    private sealed record CachedHistoryTestContext(
        Guid GameId,
        GameHistory<TestState> Store,
        CachedGameHistory<TestState> Cached,
        IConnectionMultiplexer Redis
    );

    private sealed class LoadCurrentPausingHistory(IGameHistory<TestState> inner) : IGameHistory<TestState>
    {
        public TaskCompletionSource Loaded { get; } = new(TaskCreationOptions.RunContinuationsAsynchronously);

        public TaskCompletionSource Resume { get; } = new(TaskCreationOptions.RunContinuationsAsynchronously);

        public Task<StoredState<TestState>?> Begin(Guid gameId, TestState initial, CancellationToken ct = default) =>
            inner.Begin(gameId, initial, ct);

        public Task<StoredState<TestState>?> Append(
            Guid gameId,
            StoredState<TestState> current,
            StepResult<TestState> result,
            PlayerChoice? choice,
            CancellationToken ct = default
        ) => inner.Append(gameId, current, result, choice, ct);

        public async Task<StoredState<TestState>?> LoadCurrent(Guid gameId, CancellationToken ct = default)
        {
            var loaded = await inner.LoadCurrent(gameId, ct);
            Loaded.SetResult();
            await Resume.Task;
            return loaded;
        }

        public Task<StoredState<TestState>?> LoadAt(Guid gameId, int version, CancellationToken ct = default) =>
            inner.LoadAt(gameId, version, ct);

        public Task<HistorySummary?> GetHistorySummary(Guid gameId, int headVersion, CancellationToken ct = default) =>
            inner.GetHistorySummary(gameId, headVersion, ct);

        public Task<IReadOnlySet<string>?> GetActorsForRange(
            Guid gameId,
            int fromVersionExclusive,
            int toVersionInclusive,
            CancellationToken ct = default
        ) => inner.GetActorsForRange(gameId, fromVersionExclusive, toVersionInclusive, ct);

        public Task<StoredState<TestState>?> Rewind(
            Guid gameId,
            StoredState<TestState> current,
            int targetVersion,
            CancellationToken ct = default
        ) => inner.Rewind(gameId, current, targetVersion, ct);
    }

    private CachedHistoryTestContext CreateCachedHistoryTestContext(Guid gameId)
    {
        var redis = ConnectionMultiplexer.Connect(fixture.CacheConnectionString);
        return new CachedHistoryTestContext(gameId, CreateStore(), CreateCached(CreateStore(), redis), redis);
    }

    private GameHistory<TestState> CreateStore() =>
        new(fixture.CreateDbContext(), NullLogger<GameHistory<TestState>>.Instance);

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

    private async Task DeletePersistedGame(Guid gameId)
    {
        await using var db = fixture.CreateDbContext();
        await db.Games.Where(g => g.Id == gameId).ExecuteDeleteAsync();
    }
}
