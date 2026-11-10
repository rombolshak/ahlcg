using Tablier.Games.State.Models;

namespace Tablier.Games.State.Cache;

public interface IGameStateCache<TState>
{
    Task<GameState<TState>?> Load(Guid gameId, CancellationToken ct = default);

    Task<bool> Write(
        Guid gameId,
        GameState<TState>? expected,
        GameState<TState> replacement,
        CancellationToken ct = default
    );
}
