using Tablier.Contract;
using Tablier.Engine.History.Rewind;

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

    Task<RewindHistory?> GetRewindHistory(Guid gameId, int expectedHead, CancellationToken ct);

    Task<StoredState<TState>?> Restore(
        Guid gameId,
        StoredState<TState> previous,
        int targetVersion,
        CancellationToken ct
    );
}
