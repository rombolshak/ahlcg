using System.Collections.Frozen;

namespace Ahlcg.Rules.Fixture;

public static class FixtureActions
{
    public const string SharedIncrement = "shared:inc";
    public const string SharedDecrement = "shared:dec";
    public const string SecretIncrement = "secret:inc";
    public const string SecretDecrement = "secret:dec";
    public const string Reveal = "reveal";

    public static readonly IReadOnlySet<string> All = new[]
    {
        SharedIncrement,
        SharedDecrement,
        SecretIncrement,
        SecretDecrement,
        Reveal,
    }.ToFrozenSet();
}
