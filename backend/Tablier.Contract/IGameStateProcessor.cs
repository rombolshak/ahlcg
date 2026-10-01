namespace Tablier.Contract;

public interface IGameStateProcessor<TState>
{
    IReadOnlyDictionary<string, IReadOnlySet<string>> GetMembersActions(TState state);

    StepResult<TState> Execute(TState state, string member, string action);

    StepResult<TState> Advance(TState state);
}
