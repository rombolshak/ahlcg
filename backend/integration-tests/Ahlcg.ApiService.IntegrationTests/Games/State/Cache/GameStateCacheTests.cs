using System.Diagnostics.Metrics;
using Ahlcg.ApiService.IntegrationTests.Fixture;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using StackExchange.Redis;
using Tablier.Engine.History.Rewind;
using Tablier.Games.State.Cache;
using Tablier.Games.State.Models;
using Tablier.Telemetry;

namespace Ahlcg.ApiService.IntegrationTests.Games.State.Cache;

[Collection(AppCollection.Name)]
public class GameStateCacheTests(AppFixture fixture)
{
    [Fact]
    public async Task Write_CompetingExpectedRevisions_OnlyOneWholeEnvelopeWins()
    {
        await using var redis = await ConnectionMultiplexer.ConnectAsync(fixture.CacheConnectionString);
        var cache = CreateCache(redis);
        var gameId = Guid.NewGuid();
        var baseline = CreateState(gameVersion: 7);
        Assert.True(await cache.Write(gameId, expected: null, baseline));
        var first = baseline with { Version = 1, Game = 11 };
        var second = baseline with { Version = 1, Game = 12 };

        var accepted = await Task.WhenAll(cache.Write(gameId, baseline, first), cache.Write(gameId, baseline, second));

        Assert.Single(accepted, result => result);
        var loaded = await cache.Load(gameId);
        Assert.Equivalent(accepted[0] ? first : second, loaded, strict: true);
    }

    [Fact]
    public async Task Write_ReplacedGeneration_RejectsLateOldGeneration()
    {
        await using var redis = await ConnectionMultiplexer.ConnectAsync(fixture.CacheConnectionString);
        var cache = CreateCache(redis);
        var gameId = Guid.NewGuid();
        var original = CreateState(gameVersion: 7);
        Assert.True(await cache.Write(gameId, expected: null, original));
        var replacement = CreateState(gameVersion: 7);
        Assert.True(await cache.Write(gameId, original, replacement));

        var accepted = await cache.Write(gameId, original, original with { Version = 1, Game = 99 });

        Assert.False(accepted);
        Assert.Equivalent(replacement, await cache.Load(gameId), strict: true);
    }

    [Fact]
    public async Task Load_DeletedCache_HasNoPartialEnvelope()
    {
        await using var redis = await ConnectionMultiplexer.ConnectAsync(fixture.CacheConnectionString);
        var cache = CreateCache(redis);
        var gameId = Guid.NewGuid();
        var original = CreateState(gameVersion: 12);
        Assert.True(await cache.Write(gameId, expected: null, original));

        await redis.GetDatabase().KeyDeleteAsync(CacheKeys.GetGameStateKey(gameId));

        Assert.Null(await cache.Load(gameId));
        var recovered = CreateState(gameVersion: 12);
        Assert.True(await cache.Write(gameId, expected: null, recovered));
        Assert.Equivalent(recovered, await cache.Load(gameId), strict: true);
    }

    private static GameState<int> CreateState(int gameVersion) =>
        new(
            Guid.CreateVersion7(),
            0,
            new EngineState(
                gameVersion,
                new Dictionary<string, bool>(StringComparer.Ordinal) { ["alice"] = true },
                MemberId: null,
                InviteCode: null,
                RewindMetadata.Empty with
                {
                    GameVersion = gameVersion,
                }
            ),
            gameVersion
        );

    private static GameStateCache<int> CreateCache(IConnectionMultiplexer redis) =>
        new(
            redis,
            Options.Create(new GameStateCacheOptions()),
            new TablierMetrics(
                new ServiceCollection().AddMetrics().BuildServiceProvider().GetRequiredService<IMeterFactory>()
            ),
            NullLogger<GameStateCache<int>>.Instance
        );
}
