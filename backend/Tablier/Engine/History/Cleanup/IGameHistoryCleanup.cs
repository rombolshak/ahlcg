namespace Tablier.Engine.History.Cleanup;

internal interface IGameHistoryCleanup
{
    /// <summary>Returns null when another cleanup holds the advisory lock; the next tick may retry.</summary>
    Task<GameHistoryCleanupResult?> Run(CancellationToken ct = default);
}
