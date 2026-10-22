using Tablier.Contract;

namespace Tablier;

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
}
