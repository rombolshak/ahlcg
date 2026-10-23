using Tablier.Contract;

namespace Tablier;

#pragma warning disable MA0048
public sealed class MeteredGameConfigurator<TConfiguration, TState>(
    IGameConfigurator<TConfiguration, TState> inner,
    TablierMetrics metrics,
    TimeProvider time
) : MeteredDecorator(metrics.RulesDuration, time), IGameConfigurator<TConfiguration, TState>
{
    public TState InitializeGame(TConfiguration configuration, IReadOnlyList<string> members, ulong seed) =>
        Measure("initialize_game", () => inner.InitializeGame(configuration, members, seed));
}

public sealed class MeteredGameStateProcessor<TState>(
    IGameStateProcessor<TState> inner,
    TablierMetrics metrics,
    TimeProvider time
) : MeteredDecorator(metrics.RulesDuration, time), IGameStateProcessor<TState>
{
    public IReadOnlySet<string> GetMembers(TState state) => Measure("get_members", () => inner.GetMembers(state));

    public IReadOnlyDictionary<string, IReadOnlySet<string>> GetMembersActions(TState state) =>
        Measure("get_members_actions", () => inner.GetMembersActions(state));

    public StepResult<TState> Execute(TState state, string member, string action) =>
        Measure("execute", () => inner.Execute(state, member, action));

    public StepResult<TState> Advance(TState state) => Measure("advance", () => inner.Advance(state));

    public StepResult<TState> AddMember(TState state, string member) =>
        Measure("add_member", () => inner.AddMember(state, member));

    public StepResult<TState> RemoveMember(TState state, string member) =>
        Measure("remove_member", () => inner.RemoveMember(state, member));
}

public sealed class MeteredGameViewProjector<TState, TView>(
    IGameViewProjector<TState, TView> inner,
    TablierMetrics metrics,
    TimeProvider time
) : MeteredDecorator(metrics.RulesDuration, time), IGameViewProjector<TState, TView>
{
    public TView GetMemberView(TState state, string member) =>
        Measure("get_member_view", () => inner.GetMemberView(state, member));
}
#pragma warning restore MA0048
