using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging.Testing;
using Microsoft.Extensions.Options;
using Microsoft.Extensions.Time.Testing;
using Moq;
using Tablier.Engine.History.Cleanup;

namespace Tablier.Tests.Engine.History.Cleanup;

public class GameHistoryCleanupServiceTests
{
    private static readonly TimeSpan Interval = TimeSpan.FromHours(1);
    private static readonly TimeSpan Timeout = TimeSpan.FromSeconds(10);

    [Fact]
    public async Task Start_IntervalNotElapsed_DoesNotRun()
    {
        // given
        await using var run = CreateRun();
        await run.StartAsync();

        // when
        run.Time.Advance(Interval - TimeSpan.FromSeconds(1));
        await run.Service.StopAsync(CancellationToken.None);

        // then
        run.Cleanup.Verify(c => c.Run(It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task Start_IntervalElapsedTwice_RunsTwice()
    {
        // given
        await using var run = CreateRun();
        await run.StartAsync();

        // when
        run.Time.Advance(Interval);
        await run.WaitForRun();
        run.Time.Advance(Interval);
        await run.WaitForRun();
        await run.Service.StopAsync(CancellationToken.None);

        // then
        run.Cleanup.Verify(c => c.Run(It.IsAny<CancellationToken>()), Times.Exactly(2));
    }

    [Fact]
    public async Task Start_RunThrows_LogsFailureAndRunsAgainOnNextTick()
    {
        // given
        await using var run = CreateRun(failFirstRun: true);
        await run.StartAsync();

        // when
        run.Time.Advance(Interval);
        await run.WaitForRun();
        run.Time.Advance(Interval);
        await run.WaitForRun();
        await run.Service.StopAsync(CancellationToken.None);

        // then
        Assert.Equal("LogCleanupFailed", Assert.Single(run.Logger.Collector.GetSnapshot()).Id.Name);
        run.Cleanup.Verify(c => c.Run(It.IsAny<CancellationToken>()), Times.Exactly(2));
    }

    [Fact]
    public async Task Stop_RunInFlight_EndsWithoutLoggingFailureAndNeverRunsAgain()
    {
        // given
        await using var run = CreateRun(blockUntilCancelled: true);
        await run.StartAsync();
        run.Time.Advance(Interval);
        await run.WaitForRun();

        // when
        await run.Service.StopAsync(CancellationToken.None);
        run.Time.Advance(Interval);

        // then
        Assert.Empty(run.Logger.Collector.GetSnapshot());
        run.Cleanup.Verify(c => c.Run(It.IsAny<CancellationToken>()), Times.Once);
    }

    private static TestRun CreateRun(bool failFirstRun = false, bool blockUntilCancelled = false)
    {
        var ran = new SemaphoreSlim(0);
        var calls = 0;
        var cleanup = new Mock<IGameHistoryCleanup>();
        cleanup
            .Setup(c => c.Run(It.IsAny<CancellationToken>()))
            .Returns(
                async (CancellationToken ct) =>
                {
                    var call = Interlocked.Increment(ref calls);
                    ran.Release();
                    if (blockUntilCancelled)
                    {
                        await Task.Delay(System.Threading.Timeout.Infinite, ct);
                    }

                    if (failFirstRun && call == 1)
                    {
                        throw new InvalidOperationException("boom");
                    }

                    return null;
                }
            );

        var provider = new ServiceCollection().AddScoped(_ => cleanup.Object).BuildServiceProvider();
        var time = new TimerAwareTimeProvider();
        var logger = new FakeLogger<GameHistoryCleanupService>();
        var service = new GameHistoryCleanupService(
            provider.GetRequiredService<IServiceScopeFactory>(),
            Options.Create(new GameHistoryCleanupOptions { Interval = Interval }),
            time,
            logger
        );

        return new TestRun(service, cleanup, time, logger, ran, provider);
    }

    private sealed class TimerAwareTimeProvider : FakeTimeProvider
    {
        public SemaphoreSlim TimerCreated { get; } = new(0);

        public override ITimer CreateTimer(TimerCallback callback, object? state, TimeSpan dueTime, TimeSpan period)
        {
            var timer = base.CreateTimer(callback, state, dueTime, period);
            TimerCreated.Release();
            return timer;
        }
    }

    private sealed record TestRun(
        GameHistoryCleanupService Service,
        Mock<IGameHistoryCleanup> Cleanup,
        TimerAwareTimeProvider Time,
        FakeLogger<GameHistoryCleanupService> Logger,
        SemaphoreSlim Ran,
        ServiceProvider Provider
    ) : IAsyncDisposable
    {
        public async Task StartAsync()
        {
            await Service.StartAsync(CancellationToken.None);
            Assert.True(await Time.TimerCreated.WaitAsync(Timeout), "cleanup timer was not created in time");
        }

        public async Task WaitForRun() => Assert.True(await Ran.WaitAsync(Timeout), "cleanup did not run in time");

        public async ValueTask DisposeAsync()
        {
            Service.Dispose();
            Ran.Dispose();
            Time.TimerCreated.Dispose();
            await Provider.DisposeAsync();
        }
    }
}
