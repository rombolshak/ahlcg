using Tablier.Contract;

namespace Tablier;

#pragma warning disable MA0048
public sealed class MeteredGameConfigurator<TConfiguration, TState>(
    IGameConfigurator<TConfiguration, TState> inner,
    TablierMetrics metrics,
    TimeProvider time
) : IGameConfigurator<TConfiguration, TState>
{
    public TState InitializeGame(TConfiguration configuration, IReadOnlyList<string> members, ulong seed)
    {
        var started = time.GetTimestamp();
        try
        {
            return inner.InitializeGame(configuration, members, seed);
        }
        finally
        {
            metrics.RecordRules("initialize_game", time.GetElapsedTime(started));
        }
    }
}

public sealed class MeteredGameStateProcessor<TState>(
    IGameStateProcessor<TState> inner,
    TablierMetrics metrics,
    TimeProvider time
) : IGameStateProcessor<TState>
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

    private T Measure<T>(string method, Func<T> call)
    {
        var started = time.GetTimestamp();
        try
        {
            return call();
        }
        finally
        {
            metrics.RecordRules(method, time.GetElapsedTime(started));
        }
    }
}

public sealed class MeteredGameViewProjector<TState, TView>(
    IGameViewProjector<TState, TView> inner,
    TablierMetrics metrics,
    TimeProvider time
) : IGameViewProjector<TState, TView>
{
    public TView GetMemberView(TState state, string member)
    {
        var started = time.GetTimestamp();
        try
        {
            return inner.GetMemberView(state, member);
        }
        finally
        {
            metrics.RecordRules("get_member_view", time.GetElapsedTime(started));
        }
    }
}
#pragma warning restore MA0048
