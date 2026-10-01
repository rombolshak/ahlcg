using Tablier.Contract;

namespace Ahlcg.Rules.Fixture;

public sealed class FixtureStateProcessor : IGameStateProcessor<FixtureState>
{
    public IReadOnlyDictionary<string, IReadOnlySet<string>> GetMembersActions(FixtureState state) =>
        state.RevealPending
            ? new Dictionary<string, IReadOnlySet<string>>()
            : state.Secrets.Keys.ToDictionary(member => member, _ => FixtureActions.All);

    public StepResult<FixtureState> Execute(FixtureState state, string member, string action)
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

    public StepResult<FixtureState> Advance(FixtureState state)
    {
        if (!state.RevealPending)
        {
            throw new InvalidOperationException("Nothing is pending; members still hold actions.");
        }

        var (value, random) = state.Random.Next(1, 7);
        var entry = new FixtureJournalEntry(
            "fixture.revealed",
            new Dictionary<string, object?> { ["value"] = value });

        var next = state with
        {
            Revealed = value,
            RevealPending = false,
            Journal = state.Journal.Add(entry),
            Random = random,
        };

        return new StepResult<FixtureState>(next, "reveal", true);
    }
}
