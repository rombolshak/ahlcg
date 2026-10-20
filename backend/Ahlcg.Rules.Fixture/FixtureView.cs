namespace Ahlcg.Rules.Fixture;

#pragma warning disable MA0048
public enum SecretSign
{
    Negative,
    Zero,
    Positive,
}
#pragma warning restore MA0048

public sealed record FixtureView(
    int Shared,
    int? Revealed,
    int OwnSecret,
    IReadOnlyDictionary<string, SecretSign> Others,
    IReadOnlyList<FixtureJournalEntry> Journal
);
