using Tablier.Engine.History.Rewind;
using Tablier.Games.State.Models;

namespace Tablier.Games.State.Coordination;

public interface IGameStateStore<TState>
{
    Task<GameState<TState>?> Load(GameMutationLease lease, CancellationToken ct = default);
    Task<bool> Install(
        GameMutationLease lease,
        GameState<TState> previous,
        GameState<TState> replacement,
        CancellationToken ct = default
    );
    Task<EngineState> ReadEngine(Guid gameId, int gameVersion, RewindMetadata metadata, CancellationToken ct = default);
}
