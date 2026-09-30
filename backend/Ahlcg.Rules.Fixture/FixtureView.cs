namespace Ahlcg.Rules.Fixture;

public enum SecretSign
{
    Negative,
    Zero,
    Positive,
}

public sealed record FixtureView(
    int Shared,
    int? Revealed,
    int OwnSecret,
    IReadOnlyDictionary<string, SecretSign> Others,
    IReadOnlyList<FixtureJournalEntry> Journal);
