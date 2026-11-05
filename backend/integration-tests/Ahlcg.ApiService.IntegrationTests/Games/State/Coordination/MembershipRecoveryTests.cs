using System.Data.Common;
using System.Diagnostics.Metrics;
using System.Security.Claims;
using System.Text.Json;
using Ahlcg.ApiService.IntegrationTests.Fixture;
using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging.Abstractions;
using Tablier.Data;
using Tablier.Engine;
using Tablier.Games;
using Tablier.Games.Sessions;
using Tablier.Games.State.Coordination;
using Tablier.Telemetry;

namespace Ahlcg.ApiService.IntegrationTests.Games.State.Coordination;

[Collection(AppCollection.Name)]
public class MembershipRecoveryTests(AppFixture fixture)
{
    [Fact]
    public async Task RemoveMember_PostgresCommitThenError_RevokesOfflineTargetsCodeAndRetryDoesNotDeleteTwice()
    {
        await using var run = await CreateRun();
        run.Failure.Armed = true;

        await Assert.ThrowsAsync<InvalidOperationException>(() =>
            GameEndpoints.RemoveMember(
                run.Caller,
                run.Users,
                run.Db,
                run.Sessions,
                run.Hub,
                run.GameId,
                run.TargetId,
                run.Engine,
                run.Admission,
                NullLogger<Game>.Instance
            )
        );

        Assert.Equal(1, run.Failure.Commits);
        Assert.False(
            await run
                .Db.GameMembers.AsNoTracking()
                .AnyAsync(member => member.GameId == run.GameId && member.UserId == run.TargetId)
        );
        Assert.Equal(
            2,
            (await run.Db.Games.AsNoTracking().SingleAsync(game => game.Id == run.GameId)).IntendedPlayersCount
        );
        Assert.Null(run.Sessions.FindByInviteCode("OLDCOD"));
        Assert.Null(run.Sessions.Find(run.GameId)!.InviteCode);
        Assert.Equal(0, run.Engine.Synchronizations);
        await AssertOldCodeRefused(run);

        var retried = await GameEndpoints.RemoveMember(
            run.Caller,
            run.Users,
            run.Db,
            run.Sessions,
            run.Hub,
            run.GameId,
            run.TargetId,
            run.Engine,
            run.Admission,
            NullLogger<Game>.Instance
        );

        Assert.IsType<NoContent>(retried.Result);
        Assert.Equal(1, run.Failure.Commits);
        Assert.Equal(1, run.Engine.Synchronizations);
        Assert.Equal(1, await run.Db.GameMembers.CountAsync(member => member.GameId == run.GameId));
        Assert.Equal(
            2,
            (await run.Db.Games.AsNoTracking().SingleAsync(game => game.Id == run.GameId)).IntendedPlayersCount
        );
    }

    private static async Task AssertOldCodeRefused(Run run)
    {
        var denied = await GameEndpoints.JoinGame(
            Principal(run.TargetId),
            run.Users,
            run.Db,
            run.Sessions,
            run.Hub,
            TimeProvider.System,
            new GameEndpoints.JoinGameRequest("OLDCOD"),
            run.Engine,
            run.Registry,
            NullLogger<Game>.Instance
        );
        Assert.Equal(404, Assert.IsType<ProblemHttpResult>(denied.Result).StatusCode);
    }

    private async Task<Run> CreateRun()
    {
        using var caller = fixture.CreateClient();
        var callerId = await HubTestSupport.LoginAnonymouslyAsync(fixture, caller);
        var gameId = await HubTestSupport.CreateGameAsync(caller);
        using var target = fixture.CreateClient();
        var targetId = await HubTestSupport.LoginAnonymouslyAsync(fixture, target);
        await HubTestSupport.AddMembershipAsync(fixture, gameId, targetId);
        var failure = new FailAfterCommit();
        var db = new ApplicationDbContext(
            new DbContextOptionsBuilder<ApplicationDbContext>()
                .UseNpgsql(fixture.ConnectionString)
                .AddInterceptors(failure)
                .Options
        );
        await db
            .Games.Where(game => game.Id == gameId)
            .ExecuteUpdateAsync(setters => setters.SetProperty(game => game.IntendedPlayersCount, 3));
        var services = new ServiceCollection()
            .AddLogging()
            .AddMetrics()
            .AddSingleton<TimeProvider>(TimeProvider.System);
        services.AddScoped(_ => db);
        services.AddIdentityCore<AppUser>().AddEntityFrameworkStores<ApplicationDbContext>();
        services.AddSignalR();
        var provider = services.BuildServiceProvider();
        var factory = provider.GetRequiredService<IMeterFactory>();
        var registry = new GameMutationRegistry(new TablierMetrics(factory), TimeProvider.System);
        var codes = new Queue<string>(["OLDCOD", "NEWCOD"]);
        var sessions = new GameSessions(factory, NullLogger<GameSessions>.Instance, codes.Dequeue);
        sessions.Join(gameId, callerId, "caller-connection", DateTimeOffset.UtcNow);
        sessions.SyncInviteCode(gameId, memberCount: 2, intendedPlayersCount: 3);
        return new Run(
            gameId,
            targetId,
            Principal(callerId),
            db,
            provider,
            provider.GetRequiredService<UserManager<AppUser>>(),
            sessions,
            provider.GetRequiredService<IHubContext<GameHub, IGameClient>>(),
            registry,
            new GameAdmission(db, registry, NullLogger<GameAdmission>.Instance),
            new RecordingEngine(),
            failure
        );
    }

    private static ClaimsPrincipal Principal(string id) =>
        new(new ClaimsIdentity([new Claim(ClaimTypes.NameIdentifier, id)]));

    private sealed class FailAfterCommit : DbTransactionInterceptor
    {
        public bool Armed { get; set; }
        public int Commits { get; private set; }

        public override Task TransactionCommittedAsync(
            DbTransaction transaction,
            TransactionEndEventData eventData,
            CancellationToken cancellationToken = default
        )
        {
            if (!Armed)
                return Task.CompletedTask;
            Armed = false;
            Commits++;
            throw new InvalidOperationException("commit acknowledgement unavailable");
        }
    }

    private sealed class RecordingEngine : IGameEngine
    {
        public int Synchronizations { get; private set; }

        public bool IsConfigurationValid(JsonElement configuration) => throw new NotSupportedException();

        public Task Begin(Guid gameId, JsonElement configuration, string owner, CancellationToken ct = default) =>
            throw new NotSupportedException();

        public Task SyncMembers(Guid gameId, CancellationToken ct = default) => throw new NotSupportedException();

        public Task SyncMembers(GameMutationLease lease, CancellationToken ct = default)
        {
            Synchronizations++;
            lease.IsDirty = false;
            return Task.CompletedTask;
        }

        public Task<MemberState?> GetMemberState(Guid gameId, string member, CancellationToken ct = default) =>
            throw new NotSupportedException();

        public Task<int?> Execute(Guid gameId, string member, string action, CancellationToken ct = default) =>
            throw new NotSupportedException();
    }

    private sealed record Run(
        Guid GameId,
        string TargetId,
        ClaimsPrincipal Caller,
        ApplicationDbContext Db,
        ServiceProvider Provider,
        UserManager<AppUser> Users,
        GameSessions Sessions,
        IHubContext<GameHub, IGameClient> Hub,
        GameMutationRegistry Registry,
        GameAdmission Admission,
        RecordingEngine Engine,
        FailAfterCommit Failure
    ) : IAsyncDisposable
    {
        public async ValueTask DisposeAsync()
        {
            await Provider.DisposeAsync();
            await Db.DisposeAsync();
        }
    }
}
