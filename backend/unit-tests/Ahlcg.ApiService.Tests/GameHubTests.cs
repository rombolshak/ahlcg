using System.Diagnostics.Metrics;
using System.Text.Json;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Moq;

namespace Ahlcg.ApiService.Tests;

public class GameHubTests
{
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
            sessions, db, FixedTimeProvider, clients.Object, groups.Object, new GameConnection(gameId, MemberUser, "conn-1"));

        callerClient.Verify(c => c.Exit(ExitReason.NotAMember), Times.Once);
        Assert.Null(sessions.Find(gameId));
        groups.Verify(
            g => g.AddToGroupAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<CancellationToken>()),
            Times.Never);
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
            sessions, db, FixedTimeProvider, clients.Object, groups.Object, new GameConnection(gameId, MemberUser, "conn-1"));

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

        await GameHub.Connect(sessions, db, FixedTimeProvider, clients.Object, groups.Object, new GameConnection(gameId, MemberUser, "conn-1"));

        groups.Verify(g => g.AddToGroupAsync("conn-1", gameId.ToString(), It.IsAny<CancellationToken>()), Times.Once);
        groupClient.Verify(c => c.MemberConnected(MemberUser), Times.Once);
    }

    [Fact]
    public async Task Connect_SameMemberSecondConnection_DoesNotBroadcastAgain()
    {
        var sessions = CreateSessions();
        await using var db = CreateInMemoryDb();
        var gameId = await SeedMembershipAsync(db, MemberUser);
        var groupClient = new Mock<IGameClient>();
        var clients = new Mock<IHubCallerClients<IGameClient>>();
        clients.Setup(c => c.Group(gameId.ToString())).Returns(groupClient.Object);
        var groups = new Mock<IGroupManager>();
        await GameHub.Connect(sessions, db, FixedTimeProvider, clients.Object, groups.Object, new GameConnection(gameId, MemberUser, "conn-1"));

        await GameHub.Connect(sessions, db, FixedTimeProvider, clients.Object, groups.Object, new GameConnection(gameId, MemberUser, "conn-2"));

        groupClient.Verify(c => c.MemberConnected(It.IsAny<string>()), Times.Once);
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

        await GameHub.Connect(sessions, db, FixedTimeProvider, clients.Object, groups.Object, new GameConnection(gameId, MemberUser, "conn-1"));

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

        await GameHub.Connect(sessions, db, FixedTimeProvider, clients.Object, groups.Object, new GameConnection(gameId, MemberUser, "conn-1"));

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
        await GameHub.Connect(sessions, db, FixedTimeProvider, clients.Object, groups.Object, new GameConnection(gameId, MemberUser, "conn-1"));
        var code = sessions.Find(gameId)!.InviteCode;

        await GameHub.Connect(sessions, db, FixedTimeProvider, clients.Object, groups.Object, new GameConnection(gameId, MemberUser, "conn-2"));

        Assert.Equal(code, sessions.Find(gameId)!.InviteCode);
    }

    [Fact]
    public async Task Disconnect_Member_WritesLastPlayedAt()
    {
        var sessions = CreateSessions();
        await using var db = CreateInMemoryDb();
        var gameId = await SeedMembershipAsync(db, MemberUser);
        var clients = new Mock<IHubCallerClients<IGameClient>>();
        clients.Setup(c => c.Group(It.IsAny<string>())).Returns(Mock.Of<IGameClient>());
        var groups = new Mock<IGroupManager>();
        await GameHub.Connect(sessions, db, FixedTimeProvider, clients.Object, groups.Object, new GameConnection(gameId, MemberUser, "conn-1"));

        await GameHub.Disconnect(sessions, db, FixedTimeProvider, clients.Object, new GameConnection(gameId, MemberUser, "conn-1"));

        var member = await db.GameMembers.SingleAsync(m => m.GameId == gameId && m.UserId == MemberUser);
        Assert.Equal(FixedNow, member.LastPlayedAt);
    }

    [Fact]
    public async Task Disconnect_LastConnection_DropsSessionAndTellsGroup()
    {
        var sessions = CreateSessions();
        await using var db = CreateInMemoryDb();
        var gameId = await SeedMembershipAsync(db, MemberUser);
        var groupClient = new Mock<IGameClient>();
        var clients = new Mock<IHubCallerClients<IGameClient>>();
        clients.Setup(c => c.Group(gameId.ToString())).Returns(groupClient.Object);
        var groups = new Mock<IGroupManager>();
        await GameHub.Connect(sessions, db, FixedTimeProvider, clients.Object, groups.Object, new GameConnection(gameId, MemberUser, "conn-1"));

        await GameHub.Disconnect(sessions, db, FixedTimeProvider, clients.Object, new GameConnection(gameId, MemberUser, "conn-1"));

        Assert.Null(sessions.Find(gameId));
        groupClient.Verify(c => c.MemberDisconnected(MemberUser), Times.Once);
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
        ApplicationDbContext db, string userId, int intendedPlayersCount = 1)
    {
        var game = new Game
        {
            OwnerId = userId,
            IdempotencyKey = Guid.NewGuid().ToString(),
            Configuration = JsonDocument.Parse("{}"),
            CreatedAt = FixedNow,
            LastPlayedAt = FixedNow,
            IntendedPlayersCount = intendedPlayersCount
        };
        game.Members.Add(new GameMember { UserId = userId, JoinedAt = FixedNow, LastPlayedAt = FixedNow });
        db.Games.Add(game);
        await db.SaveChangesAsync();
        return game.Id;
    }

    private static GameSessions CreateSessions()
    {
        var meterFactory = new ServiceCollection().AddMetrics().BuildServiceProvider()
            .GetRequiredService<IMeterFactory>();
        return new GameSessions(meterFactory);
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
