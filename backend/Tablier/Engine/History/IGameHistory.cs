using Tablier.Contract;
using Tablier.Engine.History.Live;

namespace Tablier.Engine.History;

internal interface IGameHistory<TState>
    where TState : ISchemaVersioned
{
    Task<StoredState<TState>> Begin(Guid gameId, TState initial, CancellationToken ct = default);

    /// <summary>Returns null only for a stale or concurrently committed append; the caller may reload and retry.</summary>
    Task<StoredState<TState>?> Append(
        Guid gameId,
        StoredState<TState> previous,
        StepResult<TState> result,
        PlayerChoice? choice,
        CancellationToken ct = default
    );

    /// <summary>Returns null only when no history has been initialized.</summary>
    Task<StoredState<TState>?> LoadCurrent(Guid gameId, CancellationToken ct = default);

    Task<StoredState<TState>> LoadAt(Guid gameId, int version, CancellationToken ct = default);

    Task<StoredState<TState>> Rewind(
        Guid gameId,
        int expectedVersion,
        int targetVersion,
        CancellationToken ct = default
    );

    Task<HistorySummary> GetHistorySummary(Guid gameId, int version, CancellationToken ct = default);

    Task<IReadOnlySet<string>> GetActorsForRange(
        Guid gameId,
        int lowerExclusiveVersion,
        int upperInclusiveVersion,
        CancellationToken ct = default
    );
}
