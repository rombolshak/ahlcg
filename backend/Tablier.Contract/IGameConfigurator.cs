namespace Tablier.Contract;

public interface IGameConfigurator<in TConfiguration, out TState>
{
    TState InitializeGame(TConfiguration configuration, IReadOnlyList<string> members, ulong seed);
}
