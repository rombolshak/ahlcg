using System.Collections.Immutable;
using Tablier.Contract;

namespace Ahlcg.Rules.Fixture;

public sealed class FixtureStateProcessor : IGameStateProcessor<FixtureConfiguration, FixtureState, FixtureView>
{
    public FixtureState Initialize(FixtureConfiguration configuration, IReadOnlyList<string> members) =>
        new(
            0,
            null,
            false,
            members.ToImmutableDictionary(member => member, _ => 0),
            []);

    public IReadOnlyDictionary<string, IReadOnlySet<string>> GetMembersActions(FixtureState state) =>
        state.RevealPending
            ? new Dictionary<string, IReadOnlySet<string>>()
            : state.Secrets.Keys.ToDictionary(member => member, _ => FixtureActions.All);

    public StepResult<FixtureState> Execute(FixtureState state, string member, string action, int seed)
    {
        if (!GetMembersActions(state).TryGetValue(member, out var offered) || !offered.Contains(action))
        {
            throw new ArgumentException($"Action '{action}' is not offered to member '{member}'.", nameof(action));
        }

        var next = action switch
        {
            FixtureActions.SharedIncrement => state with { Shared = state.Shared + 1 },
            FixtureActions.SharedDecrement => state with { Shared = state.Shared - 1 },
            FixtureActions.SecretIncrement => state with { Secrets = state.Secrets.SetItem(member, state.Secrets[member] + 1) },
            FixtureActions.SecretDecrement => state with { Secrets = state.Secrets.SetItem(member, state.Secrets[member] - 1) },
            _ => state with { RevealPending = true },
        };

        return new StepResult<FixtureState>(next, null, false);
    }

    public StepResult<FixtureState> Advance(FixtureState state, int seed)
    {
        if (!state.RevealPending)
        {
            throw new InvalidOperationException("Nothing is pending; members still hold actions.");
        }

        var value = new Random(seed).Next(1, 7);
        var entry = new FixtureJournalEntry(
            "fixture.revealed",
            new Dictionary<string, object?> { ["value"] = value });

        var next = state with
        {
            Revealed = value,
            RevealPending = false,
            Journal = state.Journal.Add(entry),
        };

        return new StepResult<FixtureState>(next, "reveal", true);
    }

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
