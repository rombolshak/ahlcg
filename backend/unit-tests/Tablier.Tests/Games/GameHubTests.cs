using System.Diagnostics.Metrics;
using System.Text.Json;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Logging.Testing;
using Moq;
using Tablier.Data;
using Tablier.Engine;
using Tablier.Games;
using Tablier.Games.Sessions;
using Tablier.Games.State.Coordination;
using Tablier.Telemetry;

namespace Tablier.Tests.Games;

public class GameHubTests
{
    private readonly Mock<IGameEngine> _engine = new();

    [Fact]
    public async Task Connect_NonMember_SendsExitAndDoesNotJoin()
    {
        var sessions = CreateSessions();
        await using var db = CreateInMemoryDb();
        var gameId = Guid.NewGuid();
        var callerClient = new Mock<IGameClient>();
        var clients = new Mock<IHubCallerClients<IGameClient>>();
        clients.Setup(c => c.Caller).Returns(callerClient.Object);
        var groups = new Mock<IGroupManager>();

        await GameHub.Connect(
            sessions,
            db,
            FixedTimeProvider,
            clients.Object,
            groups.Object,
            new GameConnection(gameId, MemberUser, "conn-1"),
            CreateAdmission(db),
            _engine.Object,
            NullLogger.Instance
        );

        callerClient.Verify(c => c.Exit(ExitReason.NotAMember), Times.Once);
        Assert.Null(sessions.Find(gameId));
        groups.Verify(
            g => g.AddToGroupAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<CancellationToken>()),
            Times.Never
        );
    }

    [Fact]
    public async Task Connect_NonMember_LogsWhyTheConnectionWasTurnedAway()
    {
        await using var db = CreateInMemoryDb();
        var clients = new Mock<IHubCallerClients<IGameClient>>();
        clients.Setup(c => c.Caller).Returns(Mock.Of<IGameClient>());
        var logger = new FakeLogger<GameHub>();

        await GameHub.Connect(
            CreateSessions(),
            db,
            FixedTimeProvider,
            clients.Object,
            Mock.Of<IGroupManager>(),
            new GameConnection(Guid.NewGuid(), MemberUser, "conn-1"),
            CreateAdmission(db),
            _engine.Object,
            logger
        );

        Assert.Equal("LogNotAMember", logger.LatestRecord.Id.Name);
    }

    [Fact]
    public async Task Connect_NonMemberOfExistingGame_SendsExitAndDoesNotJoin()
    {
        var sessions = CreateSessions();
        await using var db = CreateInMemoryDb();
        var gameId = await SeedMembershipAsync(db, OtherUser);
        var callerClient = new Mock<IGameClient>();
        var clients = new Mock<IHubCallerClients<IGameClient>>();
        clients.Setup(c => c.Caller).Returns(callerClient.Object);
        var groups = new Mock<IGroupManager>();

        await GameHub.Connect(
            sessions,
            db,
            FixedTimeProvider,
            clients.Object,
            groups.Object,
            new GameConnection(gameId, MemberUser, "conn-1"),
            CreateAdmission(db),
            _engine.Object,
            NullLogger.Instance
        );

        callerClient.Verify(c => c.Exit(ExitReason.NotAMember), Times.Once);
        Assert.Null(sessions.Find(gameId));
    }

    [Fact]
    public async Task Connect_Member_AddsToGroupAndTellsGroup()
    {
        var sessions = CreateSessions();
        await using var db = CreateInMemoryDb();
        var gameId = await SeedMembershipAsync(db, MemberUser);
        var groupClient = new Mock<IGameClient>();
        var clients = new Mock<IHubCallerClients<IGameClient>>();
        clients.Setup(c => c.Group(gameId.ToString())).Returns(groupClient.Object);
        var groups = new Mock<IGroupManager>();

        await GameHub.Connect(
            sessions,
            db,
            FixedTimeProvider,
            clients.Object,
            groups.Object,
            new GameConnection(gameId, MemberUser, "conn-1"),
            CreateAdmission(db),
            _engine.Object,
            NullLogger.Instance
        );

        groups.Verify(g => g.AddToGroupAsync("conn-1", gameId.ToString(), It.IsAny<CancellationToken>()), Times.Once);
        groups.Verify(
            g =>
                g.AddToGroupAsync(
                    "conn-1",
                    GameHub.GetMemberGroupName(gameId, MemberUser),
                    It.IsAny<CancellationToken>()
                ),
            Times.Once
        );
        _engine.Verify(
            e => e.SyncMembers(It.IsAny<GameMutationLease>(), It.IsAny<CancellationToken>()),
            Times.AtLeastOnce
        );
    }

    [Fact]
    public async Task Connect_OpenSeats_SendsTheInviteCodeToTheGroup()
    {
        var sessions = CreateSessions();
        await using var db = CreateInMemoryDb();
        var gameId = await SeedMembershipAsync(db, MemberUser, intendedPlayersCount: 2);
        var groupClient = new Mock<IGameClient>();
        var clients = new Mock<IHubCallerClients<IGameClient>>();
        clients.Setup(c => c.Group(gameId.ToString())).Returns(groupClient.Object);

        await GameHub.Connect(
            sessions,
            db,
            FixedTimeProvider,
            clients.Object,
            Mock.Of<IGroupManager>(),
            new GameConnection(gameId, MemberUser, "conn-1"),
            CreateAdmission(db),
            _engine.Object,
            NullLogger.Instance
        );

        _engine.Verify(
            e => e.SyncMembers(It.IsAny<GameMutationLease>(), It.IsAny<CancellationToken>()),
            Times.AtLeastOnce
        );
        Assert.NotNull(sessions.Find(gameId)!.InviteCode);
    }

    [Fact]
    public async Task Connect_SameMemberSecondConnection_ReconcilesMembersAndJoinsGroups()
    {
        // given
        var sessions = CreateSessions();
        await using var db = CreateInMemoryDb();
        var gameId = await SeedMembershipAsync(db, MemberUser);
        var clients = new Mock<IHubCallerClients<IGameClient>>();
        var groups = new Mock<IGroupManager>();
        await GameHub.Connect(
            sessions,
            db,
            FixedTimeProvider,
            clients.Object,
            groups.Object,
            new GameConnection(gameId, MemberUser, "conn-1"),
            CreateAdmission(db),
            _engine.Object,
            NullLogger.Instance
        );
        _engine.Invocations.Clear();

        // when
        await GameHub.Connect(
            sessions,
            db,
            FixedTimeProvider,
            clients.Object,
            groups.Object,
            new GameConnection(gameId, MemberUser, "conn-2"),
            CreateAdmission(db),
            _engine.Object,
            NullLogger.Instance
        );

        // then
        _engine.Verify(
            e =>
                e.SyncMembers(It.Is<GameMutationLease>(lease => lease.GameId == gameId), It.IsAny<CancellationToken>()),
            Times.Once
        );
        groups.Verify(g => g.AddToGroupAsync("conn-2", gameId.ToString(), It.IsAny<CancellationToken>()), Times.Once);
        groups.Verify(
            g =>
                g.AddToGroupAsync(
                    "conn-2",
                    GameHub.GetMemberGroupName(gameId, MemberUser),
                    It.IsAny<CancellationToken>()
                ),
            Times.Once
        );
        Assert.Equal(2, sessions.Find(gameId)!.Connections[MemberUser].Count);
    }

    [Fact]
    public async Task Connect_GameWithOpenSeats_SessionGetsCode()
    {
        var sessions = CreateSessions();
        await using var db = CreateInMemoryDb();
        var gameId = await SeedMembershipAsync(db, MemberUser, intendedPlayersCount: 2);
        var clients = new Mock<IHubCallerClients<IGameClient>>();
        clients.Setup(c => c.Group(It.IsAny<string>())).Returns(Mock.Of<IGameClient>());
        var groups = new Mock<IGroupManager>();

        await GameHub.Connect(
            sessions,
            db,
            FixedTimeProvider,
            clients.Object,
            groups.Object,
            new GameConnection(gameId, MemberUser, "conn-1"),
            CreateAdmission(db),
            _engine.Object,
            NullLogger.Instance
        );

        Assert.NotNull(sessions.Find(gameId)!.InviteCode);
    }

    [Fact]
    public async Task Connect_FullySeatedGame_SessionHasNoCode()
    {
        var sessions = CreateSessions();
        await using var db = CreateInMemoryDb();
        var gameId = await SeedMembershipAsync(db, MemberUser, intendedPlayersCount: 1);
        var clients = new Mock<IHubCallerClients<IGameClient>>();
        clients.Setup(c => c.Group(It.IsAny<string>())).Returns(Mock.Of<IGameClient>());
        var groups = new Mock<IGroupManager>();

        await GameHub.Connect(
            sessions,
            db,
            FixedTimeProvider,
            clients.Object,
            groups.Object,
            new GameConnection(gameId, MemberUser, "conn-1"),
            CreateAdmission(db),
            _engine.Object,
            NullLogger.Instance
        );

        Assert.Null(sessions.Find(gameId)!.InviteCode);
    }

    [Fact]
    public async Task Connect_SecondConnection_KeepsCode()
    {
        var sessions = CreateSessions();
        await using var db = CreateInMemoryDb();
        var gameId = await SeedMembershipAsync(db, MemberUser, intendedPlayersCount: 2);
        var clients = new Mock<IHubCallerClients<IGameClient>>();
        clients.Setup(c => c.Group(It.IsAny<string>())).Returns(Mock.Of<IGameClient>());
        var groups = new Mock<IGroupManager>();
        await GameHub.Connect(
            sessions,
            db,
            FixedTimeProvider,
            clients.Object,
            groups.Object,
            new GameConnection(gameId, MemberUser, "conn-1"),
            CreateAdmission(db),
            _engine.Object,
            NullLogger.Instance
        );
        var code = sessions.Find(gameId)!.InviteCode;

        await GameHub.Connect(
            sessions,
            db,
            FixedTimeProvider,
            clients.Object,
            groups.Object,
            new GameConnection(gameId, MemberUser, "conn-2"),
            CreateAdmission(db),
            _engine.Object,
            NullLogger.Instance
        );

        Assert.Equal(code, sessions.Find(gameId)!.InviteCode);
    }

    [Fact]
    public async Task Disconnect_Member_WritesLastPlayedAt()
    {
        var sessions = CreateSessions();
        await using var db = CreateInMemoryDb();
        var gameId = await SeedMembershipAsync(db, MemberUser);
        var clients = new Mock<IHubCallerClients<IGameClient>>();
        var groups = new Mock<IGroupManager>();
        await GameHub.Connect(
            sessions,
            db,
            FixedTimeProvider,
            clients.Object,
            groups.Object,
            new GameConnection(gameId, MemberUser, "conn-1"),
            CreateAdmission(db),
            _engine.Object,
            NullLogger.Instance
        );

        await GameHub.Disconnect(
            sessions,
            db,
            FixedTimeProvider,
            new GameConnection(gameId, MemberUser, "conn-1"),
            CreateRegistry(),
            _engine.Object,
            NullLogger.Instance
        );

        var member = await db.GameMembers.SingleAsync(m => m.GameId == gameId && m.UserId == MemberUser);
        Assert.Equal(FixedNow, member.LastPlayedAt);
    }

    [Fact]
    public async Task Disconnect_LastConnection_DropsSessionAndReconcilesMembers()
    {
        // given
        var sessions = CreateSessions();
        await using var db = CreateInMemoryDb();
        var gameId = await SeedMembershipAsync(db, MemberUser);
        var clients = new Mock<IHubCallerClients<IGameClient>>();
        var groups = new Mock<IGroupManager>();
        await GameHub.Connect(
            sessions,
            db,
            FixedTimeProvider,
            clients.Object,
            groups.Object,
            new GameConnection(gameId, MemberUser, "conn-1"),
            CreateAdmission(db),
            _engine.Object,
            NullLogger.Instance
        );
        _engine.Invocations.Clear();

        // when
        await GameHub.Disconnect(
            sessions,
            db,
            FixedTimeProvider,
            new GameConnection(gameId, MemberUser, "conn-1"),
            CreateRegistry(),
            _engine.Object,
            NullLogger.Instance
        );

        // then
        Assert.Null(sessions.Find(gameId));
        _engine.Verify(
            e =>
                e.SyncMembers(It.Is<GameMutationLease>(lease => lease.GameId == gameId), It.IsAny<CancellationToken>()),
            Times.Once
        );
    }

    [Fact]
    public void ParseGameId_MissingQueryParameter_ReturnsNull()
    {
        var httpContext = new DefaultHttpContext();

        Assert.Null(GameHub.ParseGameId(httpContext));
    }

    [Fact]
    public void ParseGameId_MalformedValue_ReturnsNull()
    {
        var httpContext = new DefaultHttpContext();
        httpContext.Request.QueryString = new QueryString("?gameId=not-a-guid");

        Assert.Null(GameHub.ParseGameId(httpContext));
    }

    private static async Task<Guid> SeedMembershipAsync(
        ApplicationDbContext db,
        string userId,
        int intendedPlayersCount = 1
    )
    {
        var game = new Game
        {
            OwnerId = userId,
            IdempotencyKey = Guid.NewGuid().ToString(),
            Configuration = JsonDocument.Parse("{}"),
            CreatedAt = FixedNow,
            LastPlayedAt = FixedNow,
            IntendedPlayersCount = intendedPlayersCount,
        };
        game.Members.Add(
            new GameMember
            {
                UserId = userId,
                JoinedAt = FixedNow,
                LastPlayedAt = FixedNow,
            }
        );
        db.Games.Add(game);
        await db.SaveChangesAsync();
        return game.Id;
    }

    private static GameMutationRegistry CreateRegistry() =>
        new(
            new TablierMetrics(
                new ServiceCollection().AddMetrics().BuildServiceProvider().GetRequiredService<IMeterFactory>()
            ),
            TimeProvider.System
        );

    private static GameAdmission CreateAdmission(ApplicationDbContext db) =>
        new(db, CreateRegistry(), NullLogger<GameAdmission>.Instance);

    private static GameSessions CreateSessions()
    {
        var meterFactory = new ServiceCollection()
            .AddMetrics()
            .BuildServiceProvider()
            .GetRequiredService<IMeterFactory>();
        return new GameSessions(meterFactory, NullLogger<GameSessions>.Instance);
    }

    private static ApplicationDbContext CreateInMemoryDb()
    {
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        return new ApplicationDbContext(options);
    }

    private const string MemberUser = "4139F1EA-4901-4253-A391-021FAA001677";
    private const string OtherUser = "B6E3B6BF-EFFF-4B94-9E13-2E27FFF3C7CE";

    private static readonly DateTimeOffset FixedNow = new(2026, 1, 1, 0, 0, 0, TimeSpan.Zero);
    private static readonly TimeProvider FixedTimeProvider = new FixedTimeProviderImpl();

    private sealed class FixedTimeProviderImpl : TimeProvider
    {
        public override DateTimeOffset GetUtcNow() => FixedNow;
    }
}
