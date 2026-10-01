using Tablier.Contract;

namespace Ahlcg.Rules.Fixture;

public sealed class FixtureViewProjector : IGameViewProjector<FixtureState, FixtureView>
{
    public FixtureView GetMemberView(FixtureState state, string member) =>
        new(
            state.Shared,
            state.Revealed,
            state.Secrets[member],
            state.Secrets
                .Where(secret => secret.Key != member)
                .ToDictionary(secret => secret.Key, secret => SignOf(secret.Value)),
            state.Journal);

    private static SecretSign SignOf(int value) =>
        Math.Sign(value) switch
        {
            < 0 => SecretSign.Negative,
            0 => SecretSign.Zero,
            _ => SecretSign.Positive,
        };
}
