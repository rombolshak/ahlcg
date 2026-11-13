using Tablier.Contract;
using Tablier.Engine.History.Rewind;

namespace Tablier.Engine.History;

public interface IGameHistory<TState>
    where TState : ISchemaVersioned
{
    Task<StoredState<TState>?> Begin(Guid gameId, TState initial, CancellationToken ct = default);

    Task<StoredState<TState>?> Append(
        Guid gameId,
        StoredState<TState> current,
        StepResult<TState> result,
        PlayerChoice? choice,
        CancellationToken ct = default
    );

    Task<StoredState<TState>?> LoadCurrent(Guid gameId, CancellationToken ct = default);

    Task<StoredState<TState>?> LoadAt(Guid gameId, int version, CancellationToken ct = default);

    Task<StoredState<TState>?> Rewind(
        Guid gameId,
        StoredState<TState> current,
        int targetVersion,
        CancellationToken ct = default
    );

    Task<HistorySummary?> GetHistorySummary(Guid gameId, int headVersion, CancellationToken ct = default);

    Task<IReadOnlySet<string>?> GetActorsForRange(
        Guid gameId,
        int fromVersionExclusive,
        int toVersionInclusive,
        CancellationToken ct = default
    );
}
