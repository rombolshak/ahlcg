using System.Collections.Concurrent;
using Tablier.Telemetry;

namespace Tablier.Games.State.Coordination;

public sealed class GameMutationRegistry(TablierMetrics metrics, TimeProvider time)
{
    private readonly ConcurrentDictionary<Guid, GameMutationLease.Entry> _entries = new();

    public async Task<GameMutationLease> Acquire(Guid gameId, CancellationToken ct = default)
    {
        var entry = _entries.GetOrAdd(gameId, _ => new GameMutationLease.Entry());
        var started = time.GetTimestamp();
        var outcome = "cancelled";
        try
        {
            await entry.Gate.WaitAsync(ct);
            outcome = "acquired";
            return new GameMutationLease(gameId, entry);
        }
        finally
        {
            metrics.GateWaitDuration.Record(
                time.GetElapsedTime(started).TotalSeconds,
                new KeyValuePair<string, object?>("outcome", outcome)
            );
        }
    }
}
