namespace Tablier.Contract;

public interface IGameStateProcessor<TConfiguration, TState, TView>
{
    TState Initialize(TConfiguration configuration, IReadOnlyList<string> members);

    IReadOnlyDictionary<string, IReadOnlySet<string>> GetMembersActions(TState state);

    StepResult<TState> Execute(TState state, string member, string action, int seed);

    StepResult<TState> Advance(TState state, int seed);

    TView GetMemberView(TState state, string member);
}
