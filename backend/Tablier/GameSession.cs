using System.Collections.Immutable;

namespace Tablier;

public sealed record GameSession(
    DateTimeOffset StartedAt,
    // ImmutableDictionary does not override Equals; GameSessions' CAS loop relies on this staying
    // reference-based. A structural comparer here would silently break TryUpdate/TryRemove.
    ImmutableDictionary<string, ImmutableHashSet<string>> Connections,
    int PeakMemberCount,
    string? InviteCode = null
);
