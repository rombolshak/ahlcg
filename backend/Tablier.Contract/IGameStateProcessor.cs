namespace Tablier.Contract;

public interface IGameStateProcessor<TState>
{
    IReadOnlySet<string> GetMembers(TState state);

    IReadOnlyDictionary<string, IReadOnlySet<string>> GetMembersActions(TState state);

    StepResult<TState> Execute(TState state, string member, string action);

    StepResult<TState> Advance(TState state);
}
