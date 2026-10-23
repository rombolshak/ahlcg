using System.Globalization;
using System.Text.Json;
using Microsoft.Extensions.Options;
using StackExchange.Redis;
using Tablier.Contract;

namespace Tablier;

public sealed partial class CachedGameHistory<TState>(
    [FromKeyedServices("store")] IGameHistory<TState> inner,
    IConnectionMultiplexer redis,
    IOptions<GameHistoryCacheOptions> options,
    ILogger<CachedGameHistory<TState>> logger
) : IGameHistory<TState>
    where TState : ISchemaVersioned
{
    private const string VersionField = "version";
    private const string StateField = "state";

    private const string GuardedWriteScript = """
        local stored = redis.call('HGET', KEYS[1], 'version')
        if stored and tonumber(stored) >= tonumber(ARGV[1]) then
            return 0
        end
        redis.call('HSET', KEYS[1], 'version', ARGV[1], 'state', ARGV[2])
        redis.call('PEXPIRE', KEYS[1], ARGV[3])
        return 1
        """;

    public async Task<StoredState<TState>?> Begin(Guid gameId, TState initial, CancellationToken ct)
    {
        var begun = await inner.Begin(gameId, initial, ct);
        if (begun is not null)
            await WriteGuarded(gameId, begun);

        return begun;
    }

    public async Task<StoredState<TState>?> Append(
        Guid gameId,
        StoredState<TState> previous,
        StepResult<TState> result,
        PlayerChoice? choice,
        CancellationToken ct
    )
    {
        var appended = await inner.Append(gameId, previous, result, choice, ct);
        if (appended is not null)
        {
            await WriteGuarded(gameId, appended);
        }
        else
        {
            await Evict(gameId);
        }

        return appended;
    }

    public async Task<StoredState<TState>?> LoadCurrent(Guid gameId, CancellationToken ct)
    {
        var fields = await redis
            .GetDatabase()
            .HashGetAsync(CacheKeys.GetGameStateKey(gameId), [VersionField, StateField]);
        if (fields[0].HasValue && fields[1].HasValue)
        {
            var state = JsonSerializer.Deserialize<TState>((string)fields[1]!);
            if (state is not null)
                return new StoredState<TState>((int)fields[0], state);
        }

        var loaded = await inner.LoadCurrent(gameId, ct);
        if (loaded is not null)
            await WriteGuarded(gameId, loaded);

        return loaded;
    }

    public Task<StoredState<TState>?> LoadAt(Guid gameId, int version, CancellationToken ct) =>
        inner.LoadAt(gameId, version, ct);

    private async Task WriteGuarded(Guid gameId, StoredState<TState> stored)
    {
        var written = (int)
            await redis
                .GetDatabase()
                .ScriptEvaluateAsync(
                    GuardedWriteScript,
                    [CacheKeys.GetGameStateKey(gameId)],
                    [
                        stored.Version.ToString(CultureInfo.InvariantCulture),
                        JsonSerializer.Serialize(stored.State),
                        (long)options.Value.Expiration.TotalMilliseconds,
                    ]
                );
        if (written == 0)
            LogWriteSkippedNewerCached(logger, gameId, stored.Version);
    }

    private async Task Evict(Guid gameId)
    {
        await redis.GetDatabase().KeyDeleteAsync(CacheKeys.GetGameStateKey(gameId));
        LogCurrentEvicted(logger, gameId);
    }

    [LoggerMessage(LogLevel.Debug, "Cached current state of game {GameId} evicted")]
    private static partial void LogCurrentEvicted(ILogger logger, Guid gameId);

    [LoggerMessage(
        LogLevel.Debug,
        "Cache write for game {GameId} skipped: version {Version} is not newer than the cached one"
    )]
    private static partial void LogWriteSkippedNewerCached(ILogger logger, Guid gameId, int version);
}
