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
using Tablier.Data;
using Tablier.Engine.History;
using Tablier.Engine.History.Cache;
using Tablier.Telemetry;

namespace Ahlcg.ApiService.IntegrationTests.Engine.History;

[Collection(AppCollection.Name)]
public class CachedGameHistoryTests(AppFixture fixture)
{
    private sealed record TestState(int Counter, string Label) : ISchemaVersioned
    {
        public int SchemaVersion => 1;
    }

    private static TestState State(int n) => new(n, string.Create(CultureInfo.InvariantCulture, $"state {n}"));

    private static StepResult<TestState> Step(int n) => new(State(n));

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

        public Task<StoredState<TestState>?> Begin(Guid gameId, TestState initial, CancellationToken ct) =>
            inner.Begin(gameId, initial, ct);

        public Task<StoredState<TestState>?> Append(
            Guid gameId,
            StoredState<TestState> previous,
            StepResult<TestState> result,
            PlayerChoice? choice,
            CancellationToken ct
        ) => inner.Append(gameId, previous, result, choice, ct);

        public async Task<StoredState<TestState>?> LoadCurrent(Guid gameId, CancellationToken ct)
        {
            var loaded = await inner.LoadCurrent(gameId, ct);
            Loaded.SetResult();
            await Resume.Task;
            return loaded;
        }

        public Task<StoredState<TestState>?> LoadAt(Guid gameId, int version, CancellationToken ct) =>
            inner.LoadAt(gameId, version, ct);
    }

    private Run NewRun(Guid gameId)
    {
        var redis = ConnectionMultiplexer.Connect(fixture.CacheConnectionString);
        return new Run(gameId, NewStore(), NewCached(NewStore(), redis), redis);
    }

    private GameHistory<TestState> NewStore() =>
        new(fixture.CreateDbContext(), NullLogger<GameHistory<TestState>>.Instance);

    private static CachedGameHistory<TestState> NewCached(
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

    [Fact]
    public async Task Begin_WhenCacheHoldsNewerVersion_LeavesTheNewerOne()
    {
        var gameId = await SeedGameAsync();
        var run = NewRun(gameId);
        await run
            .Redis.GetDatabase()
            .HashSetAsync(
                CacheKeys.GetGameStateKey(gameId),
                [new HashEntry("version", "5"), new HashEntry("state", JsonSerializer.Serialize(State(5)))]
            );

        await run.Cached.Begin(gameId, State(0), CancellationToken.None);
        await DeleteGameAsync(gameId);
        var loaded = await run.Cached.LoadCurrent(gameId, CancellationToken.None);

        Assert.Equal(new StoredState<TestState>(5, State(5)), loaded);
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

    private async Task DeleteGameAsync(Guid gameId)
    {
        await using var db = fixture.CreateDbContext();
        await db.Games.Where(g => g.Id == gameId).ExecuteDeleteAsync();
    }

    [Fact]
    public async Task LoadCurrent_AfterAppend_ReturnsNewHeadFromCacheWhenStoreIsGone()
    {
        var gameId = await SeedGameAsync();
        var run = NewRun(gameId);
        var begun = await run.Cached.Begin(gameId, State(0), CancellationToken.None);
        await run.Cached.Append(gameId, begun!, Step(1), choice: null, CancellationToken.None);
        await DeleteGameAsync(gameId);

        var loaded = await run.Cached.LoadCurrent(gameId, CancellationToken.None);

        Assert.Equal(new StoredState<TestState>(1, State(1)), loaded);
    }

    [Fact]
    public async Task LoadCurrent_AfterBegin_ReturnsInitialStateFromCacheWhenStoreIsGone()
    {
        var gameId = await SeedGameAsync();
        var run = NewRun(gameId);
        await run.Cached.Begin(gameId, State(0), CancellationToken.None);
        await DeleteGameAsync(gameId);

        var loaded = await run.Cached.LoadCurrent(gameId, CancellationToken.None);

        Assert.Equal(new StoredState<TestState>(0, State(0)), loaded);
    }

    [Fact]
    public async Task Append_Refused_RefreshesCacheFromStore()
    {
        var gameId = await SeedGameAsync();
        var run = NewRun(gameId);
        var begun = await run.Cached.Begin(gameId, State(0), CancellationToken.None);
        await run.Store.Append(gameId, begun!, Step(1), choice: null, CancellationToken.None);

        var refused = await run.Cached.Append(gameId, begun!, Step(9), choice: null, CancellationToken.None);
        await DeleteGameAsync(gameId);
        var loaded = await run.Cached.LoadCurrent(gameId, CancellationToken.None);

        Assert.Null(refused);
        Assert.Equal(new StoredState<TestState>(1, State(1)), loaded);
    }

    [Fact]
    public async Task LoadCurrent_MissFinishingAfterRefusedAppend_DoesNotRegressCachedHead()
    {
        var gameId = await SeedGameAsync();
        var run = NewRun(gameId);
        var begun = await run.Cached.Begin(gameId, State(0), CancellationToken.None);
        await run.Redis.GetDatabase().KeyDeleteAsync(CacheKeys.GetGameStateKey(gameId));
        var pausing = new PausingLoads(NewStore());
        var slowMiss = NewCached(pausing, run.Redis).LoadCurrent(gameId, CancellationToken.None);
        await pausing.Loaded.Task;

        await run.Cached.Append(gameId, begun!, Step(1), choice: null, CancellationToken.None);
        await run.Cached.Append(gameId, begun!, Step(9), choice: null, CancellationToken.None);
        pausing.Resume.SetResult();
        await slowMiss;
        await DeleteGameAsync(gameId);
        var loaded = await run.Cached.LoadCurrent(gameId, CancellationToken.None);

        Assert.Equal(new StoredState<TestState>(1, State(1)), loaded);
    }

    [Fact]
    public async Task LoadCurrent_GameNotBegun_ReturnsNullAndDoesNotCacheIt()
    {
        var gameId = await SeedGameAsync();
        var run = NewRun(gameId);

        var beforeBegin = await run.Cached.LoadCurrent(gameId, CancellationToken.None);
        await run.Store.Begin(gameId, State(0), CancellationToken.None);
        var afterBegin = await run.Cached.LoadCurrent(gameId, CancellationToken.None);

        Assert.Null(beforeBegin);
        Assert.Equal(new StoredState<TestState>(0, State(0)), afterBegin);
    }

    [Fact]
    public async Task LoadAt_PassesThroughToStore()
    {
        var gameId = await SeedGameAsync();
        var run = NewRun(gameId);
        await run.Cached.Begin(gameId, State(0), CancellationToken.None);

        var loaded = await run.Cached.LoadAt(gameId, 0, CancellationToken.None);

        Assert.Equal(new StoredState<TestState>(0, State(0)), loaded);
    }
}
