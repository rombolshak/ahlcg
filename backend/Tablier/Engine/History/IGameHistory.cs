using Tablier.Contract;
using Tablier.Engine.History.Live;

namespace Tablier.Engine.History;

public interface IGameHistory<TState>
    where TState : ISchemaVersioned
{
    Task<StoredState<TState>?> Begin(Guid gameId, TState initial, CancellationToken ct);

    Task<StoredState<TState>?> Append(
        Guid gameId,
        StoredState<TState> previous,
        StepResult<TState> result,
        PlayerChoice? choice,
        CancellationToken ct
    );

    Task<StoredState<TState>?> LoadCurrent(Guid gameId, CancellationToken ct);

    Task<StoredState<TState>?> LoadAt(Guid gameId, int version, CancellationToken ct);

    Task<StoredState<TState>?> Rewind(
        Guid gameId,
        int expectedVersion,
        int targetVersion,
        CancellationToken ct = default
    );

    Task<HistorySummary?> GetHistorySummary(Guid gameId, int version, CancellationToken ct = default);

    Task<IReadOnlySet<string>?> GetActorsForRange(
        Guid gameId,
        int lowerExclusiveVersion,
        int upperInclusiveVersion,
        CancellationToken ct = default
    );
}
