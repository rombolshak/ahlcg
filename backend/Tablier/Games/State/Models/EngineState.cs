using Tablier.Engine.History.Rewind;

namespace Tablier.Games.State.Models;

public sealed record EngineState(
    int GameVersion,
    IReadOnlyDictionary<string, bool> Members,
    string? MemberId,
    string? InviteCode,
    RewindMetadata Rewind,
    RewindProposal? Proposal = null,
    RewindOutcome? Outcome = null
);
