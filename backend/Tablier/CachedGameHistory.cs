using Microsoft.Extensions.Caching.Hybrid;
using Tablier.Contract;

namespace Tablier;

public sealed partial class CachedGameHistory<TState>(
    GameHistory<TState> inner,
    HybridCache cache,
    ILogger<CachedGameHistory<TState>> logger
) : IGameHistory<TState>
    where TState : ISchemaVersioned
{
    private static readonly HybridCacheEntryOptions EntryOptions = new()
    {
        Expiration = TimeSpan.FromHours(1),
        LocalCacheExpiration = TimeSpan.FromMinutes(5),
    };

    private static readonly HybridCacheEntryOptions LookupOptions = new()
    {
        Flags = HybridCacheEntryFlags.DisableUnderlyingData,
    };

    public async Task<StoredState<TState>?> Begin(Guid gameId, TState initial, CancellationToken ct)
    {
        var begun = await inner.Begin(gameId, initial, ct);
        if (begun is not null)
            await cache.SetAsync(CurrentKey(gameId), begun, EntryOptions, cancellationToken: ct);

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
            await cache.SetAsync(CurrentKey(gameId), appended, EntryOptions, cancellationToken: ct);
        }
        else
        {
            await Evict(gameId, ct);
        }

        return appended;
    }

    public async Task<StoredState<TState>?> LoadCurrent(Guid gameId, CancellationToken ct)
    {
        var cached = await cache.GetOrCreateAsync<StoredState<TState>?>(
            CurrentKey(gameId),
            static _ => ValueTask.FromResult<StoredState<TState>?>(null),
            LookupOptions,
            cancellationToken: ct
        );
        if (cached is not null)
            return cached;

        var loaded = await inner.LoadCurrent(gameId, ct);
        if (loaded is not null)
            await cache.SetAsync(CurrentKey(gameId), loaded, EntryOptions, cancellationToken: ct);

        return loaded;
    }

    public Task<StoredState<TState>?> LoadAt(Guid gameId, int version, CancellationToken ct) =>
        inner.LoadAt(gameId, version, ct);

    private async Task Evict(Guid gameId, CancellationToken ct)
    {
        await cache.RemoveAsync(CurrentKey(gameId), ct);
        LogCurrentEvicted(logger, gameId);
    }

    private static string CurrentKey(Guid gameId) => $"tablier:game:{gameId}:current";

    [LoggerMessage(LogLevel.Debug, "Cached current state of game {GameId} evicted")]
    private static partial void LogCurrentEvicted(ILogger logger, Guid gameId);
}
