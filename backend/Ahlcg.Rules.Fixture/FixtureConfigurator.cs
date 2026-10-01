using System.Collections.Immutable;
using Tablier.Contract;

namespace Ahlcg.Rules.Fixture;

public sealed class FixtureConfigurator : IGameConfigurator<FixtureConfiguration, FixtureState>
{
    public FixtureState InitializeGame(FixtureConfiguration configuration, IReadOnlyList<string> members, ulong seed) =>
        new(
            0,
            null,
            false,
            members.ToImmutableDictionary(member => member, _ => 0),
            [],
            GameRandom.FromSeed(seed));
}
