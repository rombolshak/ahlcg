using System.Collections.Immutable;
using Tablier.Contract;

namespace Ahlcg.Rules.Fixture;

public sealed record FixtureState(
    int Shared,
    int? Revealed,
    bool RevealPending,
    ImmutableDictionary<string, int> Secrets,
    ImmutableList<FixtureJournalEntry> Journal,
    GameRandom Random) : ISchemaVersioned
{
    public int SchemaVersion => 1;
}
