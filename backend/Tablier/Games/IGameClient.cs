using System.Text.Json.Nodes;
using System.Text.Json.Serialization;
using Json.Patch;
using Tablier.Games.State.Models;

namespace Tablier.Games;

#pragma warning disable MA0048
public enum ExitReason
{
    NotAMember,
}

public sealed record MemberState(MemberGameState<JsonNode> State, IReadOnlyDictionary<string, JsonPatch> Actions);

[JsonPolymorphic(TypeDiscriminatorPropertyName = "kind")]
[JsonDerivedType(typeof(StateDelta), "Delta")]
[JsonDerivedType(typeof(ResetRequired), "ResetRequired")]
public abstract record StateChange(Guid SyncId);

public sealed record ResetRequired(Guid SyncId) : StateChange(SyncId);

public sealed record StateDelta(
    Guid SyncId,
    int Version,
    int SourceGameVersion,
    int GameVersion,
    JsonPatch Patch,
    IReadOnlyDictionary<string, JsonPatch>? Actions,
    bool IsRestore = false
) : StateChange(SyncId);
#pragma warning restore MA0048

public interface IGameClient
{
    Task StateChanged(StateChange change);

    // The method name is the SignalR wire name the frontend listens on.
#pragma warning disable CA1716
    Task Exit(ExitReason reason);
#pragma warning restore CA1716
}
