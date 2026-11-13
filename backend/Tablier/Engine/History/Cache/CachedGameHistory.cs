using System.Globalization;
using System.Text.Json;
using Microsoft.Extensions.Options;
using StackExchange.Redis;
using Tablier.Contract;
using Tablier.Engine.History.Rewind;
using Tablier.Telemetry;

namespace Tablier.Engine.History.Cache;

public sealed partial class CachedGameHistory<TState>(
    [FromKeyedServices("store")] IGameHistory<TState> inner,
    IConnectionMultiplexer redis,
    IOptions<GameHistoryCacheOptions> options,
    TablierMetrics metrics,
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

    public async Task<StoredState<TState>?> Begin(Guid gameId, TState initial, CancellationToken ct = default)
    {
        var begun = await inner.Begin(gameId, initial, ct);
        if (begun is not null)
            await WriteGuarded(gameId, begun);

        return begun;
    }

    public async Task<StoredState<TState>?> Append(
        Guid gameId,
        StoredState<TState> current,
        StepResult<TState> result,
        PlayerChoice? choice,
        CancellationToken ct = default
    )
    {
        var appended = await inner.Append(gameId, current, result, choice, ct);
        if (appended is not null)
        {
            await WriteGuarded(gameId, appended);
            return appended;
        }

        var storedHead = await inner.LoadCurrent(gameId, ct);
        if (storedHead is not null && await WriteGuarded(gameId, storedHead))
            LogRefreshedAfterRefusedAppend(logger, gameId, storedHead.Version);

        return null;
    }

    public async Task<StoredState<TState>?> LoadCurrent(Guid gameId, CancellationToken ct = default)
    {
        var fields = await redis
            .GetDatabase()
            .HashGetAsync(CacheKeys.GetGameStateKey(gameId), [VersionField, StateField]);
        if (fields[0].HasValue && fields[1].HasValue)
        {
            var state = JsonSerializer.Deserialize<TState>((string)fields[1]!);
            if (state is not null)
            {
                metrics.RecordCacheLookup(hit: true);
                return new StoredState<TState>((int)fields[0], state);
            }
        }

        metrics.RecordCacheLookup(hit: false);
        var loaded = await inner.LoadCurrent(gameId, ct);
        if (loaded is not null)
            await WriteGuarded(gameId, loaded);

        return loaded;
    }

    public Task<StoredState<TState>?> LoadAt(Guid gameId, int version, CancellationToken ct = default) =>
        inner.LoadAt(gameId, version, ct);

    public async Task<StoredState<TState>?> Rewind(
        Guid gameId,
        StoredState<TState> current,
        int targetVersion,
        CancellationToken ct = default
    )
    {
        var restored = await inner.Rewind(gameId, current, targetVersion, ct);
        if (restored is not null)
            await WriteGuarded(gameId, restored);
        else
        {
            var storedHead = await inner.LoadCurrent(gameId, ct);
            if (storedHead is not null && await WriteGuarded(gameId, storedHead))
                LogRefreshedAfterRefusedRewind(logger, gameId, storedHead.Version);
        }

        return restored;
    }

    public Task<HistorySummary?> GetHistorySummary(Guid gameId, int headVersion, CancellationToken ct = default) =>
        inner.GetHistorySummary(gameId, headVersion, ct);

    public Task<IReadOnlySet<string>?> GetActorsForRange(
        Guid gameId,
        int fromVersionExclusive,
        int toVersionInclusive,
        CancellationToken ct = default
    ) => inner.GetActorsForRange(gameId, fromVersionExclusive, toVersionInclusive, ct);

    private async Task<bool> WriteGuarded(Guid gameId, StoredState<TState> stored)
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

        return written == 1;
    }

    [LoggerMessage(
        LogLevel.Debug,
        "Append for game {GameId} refused; cached state refreshed from the store to version {Version}"
    )]
    private static partial void LogRefreshedAfterRefusedAppend(ILogger logger, Guid gameId, int version);

    [LoggerMessage(
        LogLevel.Debug,
        "Restore for game {GameId} refused; cached state refreshed from the store to version {Version}"
    )]
    private static partial void LogRefreshedAfterRefusedRewind(ILogger logger, Guid gameId, int version);

    [LoggerMessage(
        LogLevel.Debug,
        "Cache write for game {GameId} skipped: version {Version} is not newer than the cached one"
    )]
    private static partial void LogWriteSkippedNewerCached(ILogger logger, Guid gameId, int version);
}
