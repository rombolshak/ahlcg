namespace Tablier.Games.State.Models;

public sealed record RewindOutcome(
    Guid Id,
    RewindDestination Destination,
    string RequesterId,
    string Status,
    string? RejectingMemberId
);
