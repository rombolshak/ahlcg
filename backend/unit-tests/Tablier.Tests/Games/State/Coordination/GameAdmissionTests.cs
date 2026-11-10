using System.Diagnostics.Metrics;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging.Abstractions;
using Tablier.Data;
using Tablier.Games.State.Coordination;
using Tablier.Telemetry;

namespace Tablier.Tests.Games.State.Coordination;

public class GameAdmissionTests
{
    [Theory]
    [InlineData(true)]
    [InlineData(false)]
    public async Task EnterMember_RecheckFails_ReleasesLeaseForTheNextOperation(bool cancelRecheck)
    {
        await using var provider = new ServiceCollection().AddMetrics().BuildServiceProvider();
        var factory = provider.GetRequiredService<IMeterFactory>();
        var registry = new GameMutationRegistry(new TablierMetrics(factory), TimeProvider.System);
        await using var db = CreateDb();
        var gameId = await SeedMember(db);
        var admission = new GameAdmission(db, registry, NullLogger<GameAdmission>.Instance);
        using var cancellation = new CancellationTokenSource();
        var interruptRecheck = false;
        using var listener = new MeterListener();
        listener.InstrumentPublished = (instrument, observer) =>
        {
            if (
                instrument.Meter == factory.Create(TablierMetrics.MeterName)
                && instrument.Name == "tablier.session.gate.wait.duration"
            )
                observer.EnableMeasurementEvents(instrument);
        };
        listener.SetMeasurementEventCallback<double>(
            (_, _, _, _) =>
            {
                if (!interruptRecheck)
                    return;
                interruptRecheck = false;
                if (cancelRecheck)
                    cancellation.Cancel();
                else
                    db.Dispose();
            }
        );
        listener.Start();
        using var held = await registry.Acquire(gameId);
        var entering = admission.EnterMember(gameId, "alice", cancellation.Token);
        Assert.False(entering.IsCompleted);
        interruptRecheck = true;

        held.Dispose();

        if (cancelRecheck)
            await Assert.ThrowsAnyAsync<OperationCanceledException>(() => entering);
        else
            await Assert.ThrowsAsync<ObjectDisposedException>(() => entering);
        var next = registry.Acquire(gameId);
        Assert.True(next.IsCompletedSuccessfully);
        using var acquired = await next;
    }

    [Fact]
    public async Task EnterMember_MembershipRemovedWhileWaiting_RefusesAfterAcquiringTheGate()
    {
        await using var provider = new ServiceCollection().AddMetrics().BuildServiceProvider();
        var registry = new GameMutationRegistry(
            new TablierMetrics(provider.GetRequiredService<IMeterFactory>()),
            TimeProvider.System
        );
        await using var db = CreateDb();
        var gameId = await SeedMember(db);
        var admission = new GameAdmission(db, registry, NullLogger<GameAdmission>.Instance);
        using var held = await registry.Acquire(gameId);
        var entering = admission.EnterMember(gameId, "alice");
        Assert.False(entering.IsCompleted);
        db.GameMembers.Remove(await db.GameMembers.SingleAsync());
        await db.SaveChangesAsync();

        held.Dispose();
        var admitted = await entering;

        Assert.Null(admitted);
        var next = registry.Acquire(gameId);
        Assert.True(next.IsCompletedSuccessfully);
        using var acquired = await next;
    }

    private static ApplicationDbContext CreateDb() =>
        new(new DbContextOptionsBuilder<ApplicationDbContext>().UseInMemoryDatabase(Guid.NewGuid().ToString()).Options);

    private static async Task<Guid> SeedMember(ApplicationDbContext db)
    {
        var gameId = Guid.NewGuid();
        db.GameMembers.Add(new GameMember { GameId = gameId, UserId = "alice" });
        await db.SaveChangesAsync();
        return gameId;
    }
}
