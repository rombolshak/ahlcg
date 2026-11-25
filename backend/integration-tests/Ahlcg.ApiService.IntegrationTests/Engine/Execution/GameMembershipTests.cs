using System.Data.Common;
using System.Diagnostics.Metrics;
using System.Text.Json;
using Ahlcg.ApiService.IntegrationTests.Fixture;
using Ahlcg.Rules.Fixture;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using Npgsql;
using Tablier.Data;
using Tablier.Engine;
using Tablier.Engine.Execution;
using Tablier.Engine.History;
using Tablier.Games;
using Tablier.Games.Sessions;

namespace Ahlcg.ApiService.IntegrationTests.Engine.Execution;

[Collection(AppCollection.Name)]
public class GameMembershipTests(AppFixture fixture)
{
    [Fact]
    public async Task Join_HistorySaveFails_RollsBackMembershipAndPublishesNoInviteChange()
    {
        await using var run = await StartGame();
        run.Failure.FailAppend = true;

        await Assert.ThrowsAsync<InvalidOperationException>(() => run.Engine.Join(run.Joiner, run.Code));

        await using var reader = fixture.CreateDbContext();
        Assert.False(await reader.GameMembers.AnyAsync(m => m.GameId == run.GameId && m.UserId == run.Joiner));
        Assert.False(await reader.GameSteps.AnyAsync(s => s.GameId == run.GameId));
        Assert.Equal(run.Code, run.Sessions.Find(run.GameId)!.InviteCode);
    }

    [Fact]
    public async Task Join_CommitRetries_DiscardsUncommittedMembershipAndCommitsOneHistoryStep()
    {
        await using var run = await StartGame();
        var attemptsBeforeJoin = run.Failure.CommitAttempts;
        run.Failure.FailCommit = true;

        var result = await run.Engine.Join(run.Joiner, run.Code);

        Assert.IsType<JoinGameResult.Joined>(result);
        Assert.Equal(attemptsBeforeJoin + 2, run.Failure.CommitAttempts);
        await using var reader = fixture.CreateDbContext();
        Assert.Single(
            await reader.GameMembers.Where(m => m.GameId == run.GameId && m.UserId == run.Joiner).ToListAsync()
        );
        var step = await reader.GameSteps.SingleAsync(s => s.GameId == run.GameId);
        Assert.True(step.IsIrreversible);
        Assert.Equal(1, step.Version);
        Assert.Null(run.Sessions.Find(run.GameId)!.InviteCode);
    }

    [Fact]
    public async Task Join_CommitRetries_ReloadsCapacityBeforeAdmittingMember()
    {
        await using var run = await StartGame();
        run.Failure.FailCommit = true;
        run.Failure.BeforeRollback = async () =>
        {
            await using var writer = fixture.CreateDbContext();
            await writer
                .Games.Where(game => game.Id == run.GameId)
                .ExecuteUpdateAsync(setters => setters.SetProperty(game => game.IntendedPlayersCount, 1));
        };

        var result = await run.Engine.Join(run.Joiner, run.Code);

        Assert.IsType<JoinGameResult.GameFull>(result);
        await using var reader = fixture.CreateDbContext();
        Assert.False(
            await reader.GameMembers.AnyAsync(member => member.GameId == run.GameId && member.UserId == run.Joiner)
        );
        Assert.False(await reader.GameSteps.AnyAsync(step => step.GameId == run.GameId));
        Assert.Equal(run.Code, run.Sessions.Find(run.GameId)!.InviteCode);
    }

    private async Task<Run> StartGame()
    {
        var failure = new JoinFailure();
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseNpgsql(fixture.ConnectionString, postgres => postgres.EnableRetryOnFailure())
            .AddInterceptors(failure)
            .Options;
        var db = new ApplicationDbContext(options);
        var owner = Guid.NewGuid().ToString();
        var joiner = Guid.NewGuid().ToString();
        db.Users.AddRange(new AppUser { Id = owner, UserName = owner }, new AppUser { Id = joiner, UserName = joiner });
        await db.SaveChangesAsync();
        var services = new ServiceCollection();
        services.AddLogging().AddMetrics();
        services.AddSignalR();
        var provider = services.BuildServiceProvider();
        var sessions = new GameSessions(
            provider.GetRequiredService<IMeterFactory>(),
            NullLogger<GameSessions>.Instance
        );
        var engine = new GameEngine<FixtureConfiguration, FixtureState, FixtureView>(
            new GameRules<FixtureConfiguration, FixtureState, FixtureView>(
                new FixtureConfigurator(),
                new FixtureStateProcessor(),
                new FixtureViewProjector()
            ),
            new GameHistory<FixtureState>(db, NullLogger<GameHistory<FixtureState>>.Instance),
            db,
            provider.GetRequiredService<IHubContext<GameHub, IGameClient>>(),
            Options.Create(new JsonHubProtocolOptions()),
            sessions,
            TimeProvider.System,
            NullLogger<GameEngine<FixtureConfiguration, FixtureState, FixtureView>>.Instance
        );
        var created = Assert.IsType<CreateGameResult.Created>(
            await engine.Create(owner, Guid.NewGuid().ToString(), JsonDocument.Parse("{}").RootElement)
        );
        created.Game.IntendedPlayersCount = 2;
        await db.SaveChangesAsync();
        sessions.Join(created.Game.Id, owner, "connection", DateTimeOffset.UtcNow);
        var code = sessions.SyncInviteCode(created.Game.Id, memberCount: 1, intendedPlayersCount: 2)!.InviteCode!;
        return new Run(db, provider, engine, sessions, created.Game.Id, joiner, code, failure);
    }

    private sealed record Run(
        ApplicationDbContext Db,
        ServiceProvider Provider,
        IGameEngine Engine,
        GameSessions Sessions,
        Guid GameId,
        string Joiner,
        string Code,
        JoinFailure Failure
    ) : IAsyncDisposable
    {
        public async ValueTask DisposeAsync()
        {
            await Db.DisposeAsync();
            await Provider.DisposeAsync();
        }
    }

    private sealed class JoinFailure : DbTransactionInterceptor, ISaveChangesInterceptor
    {
        public bool FailAppend { get; set; }
        public bool FailCommit { get; set; }
        public int CommitAttempts { get; private set; }
        public Func<Task>? BeforeRollback { get; set; }

        public ValueTask<InterceptionResult<int>> SavingChangesAsync(
            DbContextEventData eventData,
            InterceptionResult<int> result,
            CancellationToken cancellationToken = default
        )
        {
            if (
                FailAppend
                && eventData.Context!.ChangeTracker.Entries<GameStep>().Any(entry => entry.State == EntityState.Added)
            )
                throw new InvalidOperationException("Injected history append failure.");
            return ValueTask.FromResult(result);
        }

        public override async ValueTask<InterceptionResult> TransactionCommittingAsync(
            DbTransaction transaction,
            TransactionEventData eventData,
            InterceptionResult result,
            CancellationToken cancellationToken = default
        )
        {
            CommitAttempts++;
            if (FailCommit)
            {
                FailCommit = false;
                if (BeforeRollback is not null)
                    await BeforeRollback();
                throw new PostgresException(
                    "Injected rollback.",
                    "ERROR",
                    "ERROR",
                    PostgresErrorCodes.SerializationFailure
                );
            }
            return result;
        }
    }
}
