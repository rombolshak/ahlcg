using Tablier.Engine.History.Rewind;

namespace Tablier.Games.State.Models;

public sealed record MemberEngineState(
    int GameVersion,
    IReadOnlyDictionary<string, bool> Members,
    string MemberId,
    string? InviteCode,
    MemberEngineState.Targets Rewind,
    MemberEngineState.PendingProposal? Proposal,
    RewindOutcome? Outcome
)
{
    public sealed record Targets(IReadOnlyDictionary<string, int> Checkpoints, UndoTarget? Undo);

    public sealed record PendingProposal(
        Guid Id,
        int SourceGameVersion,
        string RequesterId,
        RewindDestination Destination,
        IReadOnlySet<string> RequiredVoterIds,
        IReadOnlySet<string> ApprovedVoterIds
    );
}
