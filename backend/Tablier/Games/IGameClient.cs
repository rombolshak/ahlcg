using System.Text.Json.Nodes;
using Json.Patch;

namespace Tablier.Games;

#pragma warning disable MA0048
public enum ExitReason
{
    NotAMember,
}

public sealed record MemberState(int Version, JsonNode View, IReadOnlyDictionary<string, JsonPatch> Actions);

public sealed record StateChange(int Version, JsonPatch ViewPatch, IReadOnlyDictionary<string, JsonPatch> Actions);
#pragma warning restore MA0048

public interface IGameClient
{
    Task MemberConnected(string userId);

    Task MemberDisconnected(string userId);

    Task StateChanged(StateChange change);

    Task InviteCodeChanged(string? code);

    // The method name is the SignalR wire name the frontend listens on.
#pragma warning disable CA1716
    Task Exit(ExitReason reason);
#pragma warning restore CA1716
}
