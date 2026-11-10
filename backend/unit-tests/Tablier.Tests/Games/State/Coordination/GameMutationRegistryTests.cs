using System.Diagnostics.Metrics;
using Microsoft.Extensions.DependencyInjection;
using Tablier.Games.State.Coordination;
using Tablier.Telemetry;

namespace Tablier.Tests.Games.State.Coordination;

public class GameMutationRegistryTests
{
    [Fact]
    public async Task Acquire_SameGame_WaitsForEarlierLease()
    {
        var registry = CreateRegistry();
        var gameId = Guid.NewGuid();
        using var first = await registry.Acquire(gameId);

        var waiting = registry.Acquire(gameId);

        Assert.False(waiting.IsCompleted);
        first.Dispose();
        using var second = await waiting;
        Assert.Equal(gameId, second.GameId);
    }

    [Fact]
    public async Task Acquire_CancelledWait_DoesNotReleaseActiveLease()
    {
        var registry = CreateRegistry();
        var gameId = Guid.NewGuid();
        using var first = await registry.Acquire(gameId);
        using var cancellation = new CancellationTokenSource();
        var waiting = registry.Acquire(gameId, cancellation.Token);

        await cancellation.CancelAsync();

        await Assert.ThrowsAnyAsync<OperationCanceledException>(() => waiting);
        var next = registry.Acquire(gameId);
        Assert.False(next.IsCompleted);
        first.Dispose();
        using var acquired = await next;
    }

    private static GameMutationRegistry CreateRegistry() =>
        new(
            new TablierMetrics(
                new ServiceCollection().AddMetrics().BuildServiceProvider().GetRequiredService<IMeterFactory>()
            ),
            TimeProvider.System
        );
}
