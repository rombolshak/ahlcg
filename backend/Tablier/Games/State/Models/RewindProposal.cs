namespace Tablier.Games.State.Models;

public sealed record RewindProposal(
    Guid Id,
    int SourceGameVersion,
    string RequesterId,
    RewindDestination Destination,
    IReadOnlySet<string> RequiredVoterIds,
    IReadOnlySet<string> ApprovedVoterIds,
    DateTimeOffset OpenedAt
);
