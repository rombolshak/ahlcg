using Tablier.Data;

namespace Tablier.Engine.Execution;

internal abstract record JoinGameResult
{
    internal sealed record Joined(GameMember Membership) : JoinGameResult;

    internal sealed record UnusableInvite : JoinGameResult;

    internal sealed record GameFull : JoinGameResult;
}
