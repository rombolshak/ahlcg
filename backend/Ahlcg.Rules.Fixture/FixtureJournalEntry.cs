namespace Ahlcg.Rules.Fixture;

public sealed record FixtureJournalEntry(string Key, IReadOnlyDictionary<string, object?> Parameters);
