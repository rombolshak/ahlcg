using System.Text.Json;
using Microsoft.Extensions.Options;
using StackExchange.Redis;
using Tablier.Games.State.Models;
using Tablier.Telemetry;

namespace Tablier.Games.State.Cache;

public sealed partial class GameStateCache<TState>(
    IConnectionMultiplexer redis,
    IOptions<GameStateCacheOptions> options,
    TablierMetrics metrics,
    ILogger<GameStateCache<TState>> logger
) : IGameStateCache<TState>
{
    private const string WriteScript = """
        local sync = redis.call('HGET', KEYS[1], 'sync')
        local version = redis.call('HGET', KEYS[1], 'version')
        if ARGV[1] == '' then
            if sync then return 0 end
        elseif sync ~= ARGV[1] or version ~= ARGV[2] then
            return 0
        end
        redis.call('HSET', KEYS[1], 'sync', ARGV[3], 'version', ARGV[4], 'state', ARGV[5])
        redis.call('PEXPIRE', KEYS[1], ARGV[6])
        return 1
        """;

    public async Task<GameState<TState>?> Load(Guid gameId, CancellationToken ct = default)
    {
        ct.ThrowIfCancellationRequested();
        var fields = await redis.GetDatabase().HashGetAsync(CacheKeys.GetGameStateKey(gameId), ["sync", "state"]);
        var json = (string?)fields[1];
        var state = fields[0].HasValue && json is not null ? JsonSerializer.Deserialize<GameState<TState>>(json) : null;
        metrics.RecordCacheLookup(state is not null);
        return state;
    }

    public async Task<bool> Write(
        Guid gameId,
        GameState<TState>? expected,
        GameState<TState> replacement,
        CancellationToken ct = default
    )
    {
        ct.ThrowIfCancellationRequested();
        var written = (int)
            await redis
                .GetDatabase()
                .ScriptEvaluateAsync(
                    WriteScript,
                    [CacheKeys.GetGameStateKey(gameId)],
                    [
                        expected?.SyncId.ToString() ?? "",
                        expected?.Version ?? 0,
                        replacement.SyncId.ToString(),
                        replacement.Version,
                        JsonSerializer.Serialize(replacement),
                        (long)options.Value.Expiration.TotalMilliseconds,
                    ]
                );
        LogWrite(logger, gameId, replacement.SyncId, replacement.Version, written == 1);
        return written == 1;
    }

    [LoggerMessage(
        LogLevel.Debug,
        "Envelope cache write for game {GameId} generation {SyncId} revision {Version}: accepted {Accepted}"
    )]
    private static partial void LogWrite(ILogger logger, Guid gameId, Guid syncId, int version, bool accepted);
}
