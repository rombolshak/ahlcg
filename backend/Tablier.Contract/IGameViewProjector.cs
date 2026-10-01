namespace Tablier.Contract;

public interface IGameViewProjector<in TState, out TView>
{
    TView GetMemberView(TState state, string member);
}
