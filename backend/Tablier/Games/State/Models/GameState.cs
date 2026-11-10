namespace Tablier.Games.State.Models;

#pragma warning disable MA0048
public sealed record GameState<TGame>(Guid SyncId, int Version, EngineState Engine, TGame Game);

public sealed record MemberGameState<TGame>(Guid SyncId, int Version, MemberEngineState Engine, TGame Game);
#pragma warning restore MA0048
