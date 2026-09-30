using System.Collections.Immutable;

namespace Ahlcg.Rules.Fixture;

public sealed record FixtureState(
    int Shared,
    int? Revealed,
    bool RevealPending,
    ImmutableDictionary<string, int> Secrets,
    ImmutableList<FixtureJournalEntry> Journal);
