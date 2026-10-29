using Microsoft.Extensions.Options;

namespace Tablier.Engine.History.Cleanup;

public sealed partial class GameHistoryCleanupService(
    IServiceScopeFactory scopes,
    IOptions<GameHistoryCleanupOptions> options,
    TimeProvider time,
    ILogger<GameHistoryCleanupService> logger
) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        using var timer = new PeriodicTimer(options.Value.Interval, time);
        try
        {
            while (await timer.WaitForNextTickAsync(stoppingToken))
            {
                await RunOnce(stoppingToken);
            }
        }
        catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested) { }
    }

    private async Task RunOnce(CancellationToken ct)
    {
        try
        {
            await using var scope = scopes.CreateAsyncScope();
            await scope.ServiceProvider.GetRequiredService<IGameHistoryCleanup>().Run(ct);
        }
        catch (Exception e) when (e is not OperationCanceledException || !ct.IsCancellationRequested)
        {
            LogCleanupFailed(logger, e);
        }
    }

    [LoggerMessage(LogLevel.Error, "History cleanup failed")]
    private static partial void LogCleanupFailed(ILogger logger, Exception exception);
}
