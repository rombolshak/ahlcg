namespace Tablier.Engine.History.Cleanup;

public interface IGameHistoryCleanup
{
    Task<GameHistoryCleanupResult?> Run(CancellationToken ct);
}
