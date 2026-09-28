using System.Diagnostics.Metrics;
using System.Security.Claims;
using System.Text.Json;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Moq;

namespace Ahlcg.ApiService.Tests;

public class GameEndpointsTests
{
    [Fact]
    public async Task CreateGame_LoggedIn_PersistsGameOwnedByCaller()
    {
        var userManager = GetMockUserManager();
        await using var db = CreateInMemoryDb();

        var result = await GameEndpoints.CreateGame(
            LoggedInPrincipal,
            userManager.Object,
            db,
            FixedTimeProvider,
            "idempotency-key",
            new GameEndpoints.CreateGameRequest(ParseConfiguration("""{"foo":"bar"}""")));

        var ok = Assert.IsType<Ok<GameEndpoints.GameDto>>(result.Result);
        Assert.NotNull(ok.Value);

        var stored = Assert.Single(db.Games);
        Assert.Equal(LoggedInUser, stored.OwnerId);
        Assert.Equal(ok.Value!.Id, stored.Id);
        Assert.Equal(FixedNow, stored.CreatedAt);
        Assert.Equal(FixedNow, stored.LastPlayedAt);
    }

    [Fact]
    public async Task CreateGame_LoggedIn_CreatesMembershipForCaller()
    {
        var userManager = GetMockUserManager();
        await using var db = CreateInMemoryDb();

        var result = await GameEndpoints.CreateGame(
            LoggedInPrincipal,
            userManager.Object,
            db,
            FixedTimeProvider,
            "idempotency-key",
            new GameEndpoints.CreateGameRequest(ParseConfiguration("""{"foo":"bar"}""")));

        var ok = Assert.IsType<Ok<GameEndpoints.GameDto>>(result.Result);
        var stored = Assert.Single(db.Games);
        var member = Assert.Single(db.GameMembers);
        Assert.Equal(stored.Id, member.GameId);
        Assert.Equal(LoggedInUser, member.UserId);
        Assert.Equal(FixedNow, member.JoinedAt);
        Assert.Equal(FixedNow, member.LastPlayedAt);
        Assert.NotNull(ok.Value);
    }

    [Fact]
    public async Task CreateGame_LoggedIn_DefaultsIntendedPlayersCountToOne()
    {
        var userManager = GetMockUserManager();
        await using var db = CreateInMemoryDb();

        await GameEndpoints.CreateGame(
            LoggedInPrincipal,
            userManager.Object,
            db,
            FixedTimeProvider,
            "idempotency-key",
            new GameEndpoints.CreateGameRequest(ParseConfiguration("""{"foo":"bar"}""")));

        var stored = Assert.Single(db.Games);
        Assert.Equal(1, stored.IntendedPlayersCount);
    }

    [Fact]
    public async Task CreateGame_MissingConfiguration_ReturnsValidationProblem()
    {
        var userManager = GetMockUserManager();
        await using var db = CreateInMemoryDb();

        var result = await GameEndpoints.CreateGame(
            LoggedInPrincipal,
            userManager.Object,
            db,
            FixedTimeProvider,
            "idempotency-key",
            new GameEndpoints.CreateGameRequest(default));

        Assert.IsType<ValidationProblem>(result.Result);
        Assert.Empty(db.Games);
        Assert.Empty(db.GameMembers);
    }

    [Fact]
    public async Task GetRecentGames_NoMemberships_ReturnsEmptyList()
    {
        var userManager = GetMockUserManager();
        await using var db = CreateInMemoryDb();

        var result = await GameEndpoints.GetRecentGames(LoggedInPrincipal, userManager.Object, db);

        var ok = Assert.IsType<Ok<IReadOnlyList<GameEndpoints.GameDto>>>(result.Result);
        Assert.Empty(ok.Value!);
    }

    [Fact]
    public async Task GetRecentGames_OtherUsersGame_IsNotReturned()
    {
        var userManager = GetMockUserManager();
        await using var db = CreateInMemoryDb();
        var game = await SeedGameAsync(db, OtherUser, FixedNow);
        await AddMembershipAsync(db, game.Id, OtherUser, FixedNow);

        var result = await GameEndpoints.GetRecentGames(LoggedInPrincipal, userManager.Object, db);

        var ok = Assert.IsType<Ok<IReadOnlyList<GameEndpoints.GameDto>>>(result.Result);
        Assert.Empty(ok.Value!);
    }

    [Fact]
    public async Task GetRecentGames_GameOwnedByCallerWithoutMembership_IsNotReturned()
    {
        var userManager = GetMockUserManager();
        await using var db = CreateInMemoryDb();
        await SeedGameAsync(db, LoggedInUser, FixedNow);

        var result = await GameEndpoints.GetRecentGames(LoggedInPrincipal, userManager.Object, db);

        var ok = Assert.IsType<Ok<IReadOnlyList<GameEndpoints.GameDto>>>(result.Result);
        Assert.Empty(ok.Value!);
    }

    [Fact]
    public async Task GetRecentGames_GameCallerDidNotCreate_IsReturned()
    {
        var userManager = GetMockUserManager();
        await using var db = CreateInMemoryDb();
        var game = await SeedGameAsync(db, OtherUser, FixedNow);
        await AddMembershipAsync(db, game.Id, LoggedInUser, FixedNow);

        var result = await GameEndpoints.GetRecentGames(LoggedInPrincipal, userManager.Object, db);

        var ok = Assert.IsType<Ok<IReadOnlyList<GameEndpoints.GameDto>>>(result.Result);
        var returned = Assert.Single(ok.Value!);
        Assert.Equal(game.Id, returned.Id);
    }

    [Fact]
    public async Task GetRecentGames_OrdersByCallersOwnLastPlayedAt()
    {
        var userManager = GetMockUserManager();
        await using var db = CreateInMemoryDb();
        var olderGame = await SeedGameAsync(db, OtherUser, FixedNow.AddDays(2));
        await AddMembershipAsync(db, olderGame.Id, LoggedInUser, FixedNow);
        await AddMembershipAsync(db, olderGame.Id, OtherUser, FixedNow.AddDays(2));
        var newerGame = await SeedGameAsync(db, OtherUser, FixedNow.AddDays(1));
        await AddMembershipAsync(db, newerGame.Id, LoggedInUser, FixedNow.AddDays(3));
        await AddMembershipAsync(db, newerGame.Id, OtherUser, FixedNow.AddDays(1));

        var result = await GameEndpoints.GetRecentGames(LoggedInPrincipal, userManager.Object, db);

        var ok = Assert.IsType<Ok<IReadOnlyList<GameEndpoints.GameDto>>>(result.Result);
        Assert.Equal([newerGame.Id, olderGame.Id], ok.Value!.Select(g => g.Id));
    }

    [Fact]
    public async Task GetRecentGames_MoreThanTwoCompleted_ReturnsTwoMostRecentlyCompletedAndEveryActive()
    {
        var userManager = GetMockUserManager();
        await using var db = CreateInMemoryDb();
        var active = await SeedGameAsync(db, LoggedInUser, FixedNow);
        await AddMembershipAsync(db, active.Id, LoggedInUser, FixedNow);
        var oldestCompleted = await SeedGameAsync(db, LoggedInUser, FixedNow, FixedNow);
        await AddMembershipAsync(db, oldestCompleted.Id, LoggedInUser, FixedNow.AddDays(9));
        var middleCompleted = await SeedGameAsync(db, LoggedInUser, FixedNow, FixedNow.AddDays(1));
        await AddMembershipAsync(db, middleCompleted.Id, LoggedInUser, FixedNow.AddDays(1));
        var newestCompleted = await SeedGameAsync(db, LoggedInUser, FixedNow, FixedNow.AddDays(2));
        await AddMembershipAsync(db, newestCompleted.Id, LoggedInUser, FixedNow.AddDays(2));

        var result = await GameEndpoints.GetRecentGames(LoggedInPrincipal, userManager.Object, db);

        var ok = Assert.IsType<Ok<IReadOnlyList<GameEndpoints.GameDto>>>(result.Result);
        Assert.Equal([active.Id, newestCompleted.Id, middleCompleted.Id], ok.Value!.Select(g => g.Id));
    }

    [Fact]
    public async Task GetRecentGames_ListsActiveBeforeCompleted()
    {
        var userManager = GetMockUserManager();
        await using var db = CreateInMemoryDb();
        var completed = await SeedGameAsync(db, LoggedInUser, FixedNow, FixedNow.AddDays(5));
        await AddMembershipAsync(db, completed.Id, LoggedInUser, FixedNow.AddDays(5));
        var active = await SeedGameAsync(db, LoggedInUser, FixedNow);
        await AddMembershipAsync(db, active.Id, LoggedInUser, FixedNow);

        var result = await GameEndpoints.GetRecentGames(LoggedInPrincipal, userManager.Object, db);

        var ok = Assert.IsType<Ok<IReadOnlyList<GameEndpoints.GameDto>>>(result.Result);
        Assert.Equal([active.Id, completed.Id], ok.Value!.Select(g => g.Id));
    }

    [Fact]
    public async Task GetArchivedGames_ReturnsEveryCompletedAndNoActive()
    {
        var userManager = GetMockUserManager();
        await using var db = CreateInMemoryDb();
        var active = await SeedGameAsync(db, LoggedInUser, FixedNow);
        await AddMembershipAsync(db, active.Id, LoggedInUser, FixedNow);
        var completedA = await SeedGameAsync(db, LoggedInUser, FixedNow, FixedNow);
        await AddMembershipAsync(db, completedA.Id, LoggedInUser, FixedNow);
        var completedB = await SeedGameAsync(db, LoggedInUser, FixedNow, FixedNow.AddDays(1));
        await AddMembershipAsync(db, completedB.Id, LoggedInUser, FixedNow.AddDays(1));

        var result = await GameEndpoints.GetArchivedGames(LoggedInPrincipal, userManager.Object, db);

        var ok = Assert.IsType<Ok<IReadOnlyList<GameEndpoints.GameDto>>>(result.Result);
        Assert.Equal([completedB.Id, completedA.Id], ok.Value!.Select(g => g.Id));
    }

    [Fact]
    public async Task GetArchivedGames_OrdersByCompletedAtNotLastPlayedAt()
    {
        var userManager = GetMockUserManager();
        await using var db = CreateInMemoryDb();
        var newerPlayedOlderCompleted = await SeedGameAsync(db, LoggedInUser, FixedNow, FixedNow);
        await AddMembershipAsync(db, newerPlayedOlderCompleted.Id, LoggedInUser, FixedNow.AddDays(9));
        var olderPlayedNewerCompleted = await SeedGameAsync(db, LoggedInUser, FixedNow, FixedNow.AddDays(1));
        await AddMembershipAsync(db, olderPlayedNewerCompleted.Id, LoggedInUser, FixedNow);

        var result = await GameEndpoints.GetArchivedGames(LoggedInPrincipal, userManager.Object, db);

        var ok = Assert.IsType<Ok<IReadOnlyList<GameEndpoints.GameDto>>>(result.Result);
        Assert.Equal([olderPlayedNewerCompleted.Id, newerPlayedOlderCompleted.Id], ok.Value!.Select(g => g.Id));
    }

    [Fact]
    public async Task GetArchivedGames_NoCompleted_ReturnsEmptyList()
    {
        var userManager = GetMockUserManager();
        await using var db = CreateInMemoryDb();
        var active = await SeedGameAsync(db, LoggedInUser, FixedNow);
        await AddMembershipAsync(db, active.Id, LoggedInUser, FixedNow);

        var result = await GameEndpoints.GetArchivedGames(LoggedInPrincipal, userManager.Object, db);

        var ok = Assert.IsType<Ok<IReadOnlyList<GameEndpoints.GameDto>>>(result.Result);
        Assert.Empty(ok.Value!);
    }

    [Fact]
    public async Task GetArchivedGames_OtherUsersCompletedGame_IsNotReturned()
    {
        var userManager = GetMockUserManager();
        await using var db = CreateInMemoryDb();
        var game = await SeedGameAsync(db, OtherUser, FixedNow, FixedNow);
        await AddMembershipAsync(db, game.Id, OtherUser, FixedNow);

        var result = await GameEndpoints.GetArchivedGames(LoggedInPrincipal, userManager.Object, db);

        var ok = Assert.IsType<Ok<IReadOnlyList<GameEndpoints.GameDto>>>(result.Result);
        Assert.Empty(ok.Value!);
    }

    [Fact]
    public async Task GetArchivedGames_GameOwnedByCallerWithoutMembership_IsNotReturned()
    {
        var userManager = GetMockUserManager();
        await using var db = CreateInMemoryDb();
        await SeedGameAsync(db, LoggedInUser, FixedNow, FixedNow);

        var result = await GameEndpoints.GetArchivedGames(LoggedInPrincipal, userManager.Object, db);

        var ok = Assert.IsType<Ok<IReadOnlyList<GameEndpoints.GameDto>>>(result.Result);
        Assert.Empty(ok.Value!);
    }

    [Fact]
    public async Task GetArchivedGames_MapsCompletedAtOntoDto()
    {
        var userManager = GetMockUserManager();
        await using var db = CreateInMemoryDb();
        var game = await SeedGameAsync(db, LoggedInUser, FixedNow, FixedNow.AddDays(1));
        await AddMembershipAsync(db, game.Id, LoggedInUser, FixedNow);

        var result = await GameEndpoints.GetArchivedGames(LoggedInPrincipal, userManager.Object, db);

        var ok = Assert.IsType<Ok<IReadOnlyList<GameEndpoints.GameDto>>>(result.Result);
        var returned = Assert.Single(ok.Value!);
        Assert.Equal(FixedNow.AddDays(1), returned.CompletedAt);
    }

    [Fact]
    public async Task GetLatestGame_NoMemberships_ReturnsNoContent()
    {
        var userManager = GetMockUserManager();
        await using var db = CreateInMemoryDb();

        var result = await GameEndpoints.GetLatestGame(LoggedInPrincipal, userManager.Object, db);

        Assert.IsType<NoContent>(result.Result);
    }

    [Fact]
    public async Task GetLatestGame_ReturnsMostRecentlyPlayedByCaller()
    {
        var userManager = GetMockUserManager();
        await using var db = CreateInMemoryDb();
        var olderGame = await SeedGameAsync(db, LoggedInUser, FixedNow);
        await AddMembershipAsync(db, olderGame.Id, LoggedInUser, FixedNow);
        var newerGame = await SeedGameAsync(db, LoggedInUser, FixedNow.AddDays(1));
        await AddMembershipAsync(db, newerGame.Id, LoggedInUser, FixedNow.AddDays(1));

        var result = await GameEndpoints.GetLatestGame(LoggedInPrincipal, userManager.Object, db);

        var ok = Assert.IsType<Ok<GameEndpoints.GameDto>>(result.Result);
        Assert.Equal(newerGame.Id, ok.Value!.Id);
    }

    [Fact]
    public async Task GetLatestGame_OtherUsersGame_IsNotReturned()
    {
        var userManager = GetMockUserManager();
        await using var db = CreateInMemoryDb();
        var game = await SeedGameAsync(db, OtherUser, FixedNow);
        await AddMembershipAsync(db, game.Id, OtherUser, FixedNow);

        var result = await GameEndpoints.GetLatestGame(LoggedInPrincipal, userManager.Object, db);

        Assert.IsType<NoContent>(result.Result);
    }

    [Fact]
    public async Task GetLatestGame_UsesCallersOwnLastPlayedAt()
    {
        var userManager = GetMockUserManager();
        await using var db = CreateInMemoryDb();
        var game = await SeedGameAsync(db, LoggedInUser, FixedNow.AddDays(5));
        await AddMembershipAsync(db, game.Id, LoggedInUser, FixedNow);

        var result = await GameEndpoints.GetLatestGame(LoggedInPrincipal, userManager.Object, db);

        var ok = Assert.IsType<Ok<GameEndpoints.GameDto>>(result.Result);
        Assert.Equal(FixedNow, ok.Value!.LastPlayedAt);
    }

    [Fact]
    public async Task GetLatestGame_CompletedGame_IsNotReturned()
    {
        var userManager = GetMockUserManager();
        await using var db = CreateInMemoryDb();
        var game = await SeedGameAsync(db, LoggedInUser, FixedNow, FixedNow);
        await AddMembershipAsync(db, game.Id, LoggedInUser, FixedNow);

        var result = await GameEndpoints.GetLatestGame(LoggedInPrincipal, userManager.Object, db);

        Assert.IsType<NoContent>(result.Result);
    }

    [Fact]
    public async Task GetMembers_NonMember_ReturnsForbidden()
    {
        var userManager = GetMockUserManager();
        await using var db = CreateInMemoryDb();
        var sessions = CreateSessions();
        var game = await SeedGameAsync(db, OtherUser, FixedNow);
        await AddMembershipAsync(db, game.Id, OtherUser, FixedNow);

        var result = await GameEndpoints.GetMembers(LoggedInPrincipal, userManager.Object, db, sessions, game.Id);

        var problem = Assert.IsType<ProblemHttpResult>(result.Result);
        Assert.Equal(StatusCodes.Status403Forbidden, problem.StatusCode);
    }

    [Fact]
    public async Task GetMembers_ReflectsSessionOnlineState()
    {
        var userManager = GetMockUserManager(LoggedInUser, OtherUser);
        await using var db = CreateInMemoryDb();
        var sessions = CreateSessions();
        var game = await SeedGameAsync(db, LoggedInUser, FixedNow);
        await AddMembershipAsync(db, game.Id, LoggedInUser, FixedNow);
        await AddMembershipAsync(db, game.Id, OtherUser, FixedNow);
        sessions.Join(game.Id, LoggedInUser, "conn-1", FixedNow);

        var result = await GameEndpoints.GetMembers(LoggedInPrincipal, userManager.Object, db, sessions, game.Id);

        var ok = Assert.IsType<Ok<IReadOnlyList<GameEndpoints.MemberDto>>>(result.Result);
        var online = ok.Value!.ToDictionary(m => m.UserId, m => m.Online);
        Assert.True(online[LoggedInUser]);
        Assert.False(online[OtherUser]);
    }

    [Fact]
    public async Task GetMembers_NoSession_EveryMemberReadsOffline()
    {
        var userManager = GetMockUserManager();
        await using var db = CreateInMemoryDb();
        var sessions = CreateSessions();
        var game = await SeedGameAsync(db, LoggedInUser, FixedNow);
        await AddMembershipAsync(db, game.Id, LoggedInUser, FixedNow);

        var result = await GameEndpoints.GetMembers(LoggedInPrincipal, userManager.Object, db, sessions, game.Id);

        var ok = Assert.IsType<Ok<IReadOnlyList<GameEndpoints.MemberDto>>>(result.Result);
        Assert.All(ok.Value!, m => Assert.False(m.Online));
    }

    [Fact]
    public async Task RemoveMember_MemberRemovesAnother_DeletesRowAndDecrementsCount()
    {
        var userManager = GetMockUserManager(LoggedInUser, OtherUser);
        await using var db = CreateInMemoryDb();
        var sessions = CreateSessions();
        var (hub, _, _) = CreateMockHub();
        var game = await SeedGameAsync(db, LoggedInUser, FixedNow, intendedPlayersCount: 2);
        await AddMembershipAsync(db, game.Id, LoggedInUser, FixedNow);
        await AddMembershipAsync(db, game.Id, OtherUser, FixedNow);

        var result = await GameEndpoints.RemoveMember(
            LoggedInPrincipal, userManager.Object, db, sessions, hub.Object, game.Id, OtherUser);

        Assert.IsType<NoContent>(result.Result);
        Assert.False(await db.GameMembers.AnyAsync(m => m.GameId == game.Id && m.UserId == OtherUser));
        var stored = await db.Games.SingleAsync(g => g.Id == game.Id);
        Assert.Equal(1, stored.IntendedPlayersCount);
    }

    [Fact]
    public async Task RemoveMember_NonMember_ReturnsForbidden()
    {
        var userManager = GetMockUserManager();
        await using var db = CreateInMemoryDb();
        var sessions = CreateSessions();
        var (hub, _, _) = CreateMockHub();
        var game = await SeedGameAsync(db, OtherUser, FixedNow, intendedPlayersCount: 2);
        await AddMembershipAsync(db, game.Id, OtherUser, FixedNow);

        var result = await GameEndpoints.RemoveMember(
            LoggedInPrincipal, userManager.Object, db, sessions, hub.Object, game.Id, OtherUser);

        var problem = Assert.IsType<ProblemHttpResult>(result.Result);
        Assert.Equal(StatusCodes.Status403Forbidden, problem.StatusCode);
    }

    [Fact]
    public async Task RemoveMember_NonCreatorRemovesCreator_Succeeds()
    {
        var userManager = GetMockUserManager(LoggedInUser, OtherUser);
        await using var db = CreateInMemoryDb();
        var sessions = CreateSessions();
        var (hub, _, _) = CreateMockHub();
        var game = await SeedGameAsync(db, OtherUser, FixedNow, intendedPlayersCount: 2);
        await AddMembershipAsync(db, game.Id, OtherUser, FixedNow);
        await AddMembershipAsync(db, game.Id, LoggedInUser, FixedNow);

        var result = await GameEndpoints.RemoveMember(
            LoggedInPrincipal, userManager.Object, db, sessions, hub.Object, game.Id, OtherUser);

        Assert.IsType<NoContent>(result.Result);
        Assert.False(await db.GameMembers.AnyAsync(m => m.GameId == game.Id && m.UserId == OtherUser));
    }

    [Fact]
    public async Task RemoveMember_UnknownTarget_ReturnsNotFound()
    {
        var userManager = GetMockUserManager();
        await using var db = CreateInMemoryDb();
        var sessions = CreateSessions();
        var (hub, _, _) = CreateMockHub();
        var game = await SeedGameAsync(db, LoggedInUser, FixedNow);
        await AddMembershipAsync(db, game.Id, LoggedInUser, FixedNow);

        var result = await GameEndpoints.RemoveMember(
            LoggedInPrincipal, userManager.Object, db, sessions, hub.Object, game.Id, OtherUser);

        Assert.IsType<NotFound>(result.Result);
    }

    [Fact]
    public async Task RemoveMember_SelfRemovalWithOthersPresent_Succeeds()
    {
        var userManager = GetMockUserManager(LoggedInUser, OtherUser);
        await using var db = CreateInMemoryDb();
        var sessions = CreateSessions();
        var (hub, _, _) = CreateMockHub();
        var game = await SeedGameAsync(db, LoggedInUser, FixedNow, intendedPlayersCount: 2);
        await AddMembershipAsync(db, game.Id, LoggedInUser, FixedNow);
        await AddMembershipAsync(db, game.Id, OtherUser, FixedNow);

        var result = await GameEndpoints.RemoveMember(
            LoggedInPrincipal, userManager.Object, db, sessions, hub.Object, game.Id, LoggedInUser);

        Assert.IsType<NoContent>(result.Result);
        Assert.False(await db.GameMembers.AnyAsync(m => m.GameId == game.Id && m.UserId == LoggedInUser));
    }

    [Fact]
    public async Task RemoveMember_LastMember_ReturnsValidationProblemAndKeepsRow()
    {
        var userManager = GetMockUserManager();
        await using var db = CreateInMemoryDb();
        var sessions = CreateSessions();
        var (hub, _, _) = CreateMockHub();
        var game = await SeedGameAsync(db, LoggedInUser, FixedNow);
        await AddMembershipAsync(db, game.Id, LoggedInUser, FixedNow);

        var result = await GameEndpoints.RemoveMember(
            LoggedInPrincipal, userManager.Object, db, sessions, hub.Object, game.Id, LoggedInUser);

        Assert.IsType<ValidationProblem>(result.Result);
        Assert.True(await db.GameMembers.AnyAsync(m => m.GameId == game.Id && m.UserId == LoggedInUser));
    }

    [Fact]
    public async Task RemoveMember_RemovedUser_NoLongerListedInGetRecentGames()
    {
        var userManager = GetMockUserManager(LoggedInUser, OtherUser);
        await using var db = CreateInMemoryDb();
        var sessions = CreateSessions();
        var (hub, _, _) = CreateMockHub();
        var game = await SeedGameAsync(db, LoggedInUser, FixedNow, intendedPlayersCount: 2);
        await AddMembershipAsync(db, game.Id, LoggedInUser, FixedNow);
        await AddMembershipAsync(db, game.Id, OtherUser, FixedNow);

        await GameEndpoints.RemoveMember(
            LoggedInPrincipal, userManager.Object, db, sessions, hub.Object, game.Id, OtherUser);
        var result = await GameEndpoints.GetRecentGames(OtherPrincipal, userManager.Object, db);

        var ok = Assert.IsType<Ok<IReadOnlyList<GameEndpoints.GameDto>>>(result.Result);
        Assert.Empty(ok.Value!);
    }

    [Fact]
    public async Task RemoveMember_ConnectedTarget_DropsItsConnectionsAndSendsExit()
    {
        var userManager = GetMockUserManager(LoggedInUser, OtherUser);
        await using var db = CreateInMemoryDb();
        var sessions = CreateSessions();
        var (hub, groups, clients) = CreateMockHub();
        var targetClient = new Mock<IGameClient>();
        clients
            .Setup(c => c.Clients(It.Is<IReadOnlyList<string>>(ids => ids.Contains("target-conn"))))
            .Returns(targetClient.Object);
        var game = await SeedGameAsync(db, LoggedInUser, FixedNow, intendedPlayersCount: 2);
        await AddMembershipAsync(db, game.Id, LoggedInUser, FixedNow);
        await AddMembershipAsync(db, game.Id, OtherUser, FixedNow);
        sessions.Join(game.Id, LoggedInUser, "caller-conn", FixedNow);
        sessions.Join(game.Id, OtherUser, "target-conn", FixedNow);

        await GameEndpoints.RemoveMember(
            LoggedInPrincipal, userManager.Object, db, sessions, hub.Object, game.Id, OtherUser);

        groups.Verify(
            g => g.RemoveFromGroupAsync("target-conn", game.Id.ToString(), It.IsAny<CancellationToken>()),
            Times.Once);
        groups.Verify(
            g => g.RemoveFromGroupAsync("caller-conn", It.IsAny<string>(), It.IsAny<CancellationToken>()),
            Times.Never);
        targetClient.Verify(c => c.Exit(ExitReason.NotAMember), Times.Once);
    }

    [Fact]
    public async Task RemoveMember_TableFullAfterRemoval_ClearsCodeAndIssuesNone()
    {
        var userManager = GetMockUserManager(LoggedInUser, OtherUser);
        await using var db = CreateInMemoryDb();
        var sessions = CreateSessions();
        var (hub, _, _) = CreateMockHub();
        var game = await SeedGameAsync(db, LoggedInUser, FixedNow, intendedPlayersCount: 2);
        await AddMembershipAsync(db, game.Id, LoggedInUser, FixedNow);
        await AddMembershipAsync(db, game.Id, OtherUser, FixedNow);
        sessions.Join(game.Id, LoggedInUser, "conn-1", FixedNow);
        var priorCode = sessions.SyncInviteCode(game.Id, memberCount: 1, intendedPlayersCount: 2)!.InviteCode!;

        await GameEndpoints.RemoveMember(
            LoggedInPrincipal, userManager.Object, db, sessions, hub.Object, game.Id, OtherUser);

        Assert.Null(sessions.Find(game.Id)!.InviteCode);
        Assert.Null(sessions.FindByInviteCode(priorCode));
    }

    [Fact]
    public async Task RemoveMember_OpenSeatsAfterRemoval_RotatesToADifferentCode()
    {
        var userManager = GetMockUserManager(LoggedInUser, OtherUser);
        await using var db = CreateInMemoryDb();
        var codes = new Queue<string>(["OLDCOD", "NEWCOD"]);
        var sessions = CreateSessions(codes.Dequeue);
        var (hub, _, _) = CreateMockHub();
        var game = await SeedGameAsync(db, LoggedInUser, FixedNow, intendedPlayersCount: 3);
        await AddMembershipAsync(db, game.Id, LoggedInUser, FixedNow);
        await AddMembershipAsync(db, game.Id, OtherUser, FixedNow);
        sessions.Join(game.Id, LoggedInUser, "conn-1", FixedNow);
        var priorCode = sessions.SyncInviteCode(game.Id, memberCount: 1, intendedPlayersCount: 3)!.InviteCode!;

        await GameEndpoints.RemoveMember(
            LoggedInPrincipal, userManager.Object, db, sessions, hub.Object, game.Id, OtherUser);

        var newCode = sessions.Find(game.Id)!.InviteCode;
        Assert.NotNull(newCode);
        Assert.NotEqual(priorCode, newCode);
        Assert.Null(sessions.FindByInviteCode(priorCode));
    }

    [Fact]
    public async Task SetMembersCount_Raise_IssuesCode()
    {
        var userManager = GetMockUserManager();
        await using var db = CreateInMemoryDb();
        var sessions = CreateSessions();
        var game = await SeedGameAsync(db, LoggedInUser, FixedNow);
        await AddMembershipAsync(db, game.Id, LoggedInUser, FixedNow);
        sessions.Join(game.Id, LoggedInUser, "conn-1", FixedNow);

        var result = await GameEndpoints.SetMembersCount(
            LoggedInPrincipal, userManager.Object, db, sessions, game.Id, new GameEndpoints.SetMembersCountRequest(2));

        Assert.IsType<NoContent>(result.Result);
        Assert.NotNull(sessions.Find(game.Id)!.InviteCode);
        var stored = await db.Games.SingleAsync(g => g.Id == game.Id);
        Assert.Equal(2, stored.IntendedPlayersCount);
    }

    [Fact]
    public async Task SetMembersCount_LowerToMemberCount_ClearsCode()
    {
        var userManager = GetMockUserManager(LoggedInUser, OtherUser);
        await using var db = CreateInMemoryDb();
        var sessions = CreateSessions();
        var game = await SeedGameAsync(db, LoggedInUser, FixedNow, intendedPlayersCount: 3);
        await AddMembershipAsync(db, game.Id, LoggedInUser, FixedNow);
        await AddMembershipAsync(db, game.Id, OtherUser, FixedNow);
        sessions.Join(game.Id, LoggedInUser, "conn-1", FixedNow);
        sessions.SyncInviteCode(game.Id, memberCount: 2, intendedPlayersCount: 3);

        var result = await GameEndpoints.SetMembersCount(
            LoggedInPrincipal, userManager.Object, db, sessions, game.Id, new GameEndpoints.SetMembersCountRequest(2));

        Assert.IsType<NoContent>(result.Result);
        Assert.Null(sessions.Find(game.Id)!.InviteCode);
    }

    [Fact]
    public async Task SetMembersCount_LowerBelowMemberCount_ReturnsValidationProblemUnchanged()
    {
        var userManager = GetMockUserManager(LoggedInUser, OtherUser);
        await using var db = CreateInMemoryDb();
        var sessions = CreateSessions();
        var game = await SeedGameAsync(db, LoggedInUser, FixedNow, intendedPlayersCount: 2);
        await AddMembershipAsync(db, game.Id, LoggedInUser, FixedNow);
        await AddMembershipAsync(db, game.Id, OtherUser, FixedNow);

        var result = await GameEndpoints.SetMembersCount(
            LoggedInPrincipal, userManager.Object, db, sessions, game.Id, new GameEndpoints.SetMembersCountRequest(1));

        Assert.IsType<ValidationProblem>(result.Result);
        var stored = await db.Games.SingleAsync(g => g.Id == game.Id);
        Assert.Equal(2, stored.IntendedPlayersCount);
    }

    [Fact]
    public async Task SetMembersCount_NonMember_ReturnsForbidden()
    {
        var userManager = GetMockUserManager();
        await using var db = CreateInMemoryDb();
        var sessions = CreateSessions();
        var game = await SeedGameAsync(db, OtherUser, FixedNow);
        await AddMembershipAsync(db, game.Id, OtherUser, FixedNow);

        var result = await GameEndpoints.SetMembersCount(
            LoggedInPrincipal, userManager.Object, db, sessions, game.Id, new GameEndpoints.SetMembersCountRequest(2));

        var problem = Assert.IsType<ProblemHttpResult>(result.Result);
        Assert.Equal(StatusCodes.Status403Forbidden, problem.StatusCode);
    }

    private static JsonElement ParseConfiguration(string json) => JsonDocument.Parse(json).RootElement.Clone();

    private static async Task<Game> SeedGameAsync(
        ApplicationDbContext db,
        string ownerId,
        DateTimeOffset lastPlayedAt,
        DateTimeOffset? completedAt = null,
        int intendedPlayersCount = 1)
    {
        var game = new Game
        {
            OwnerId = ownerId,
            IdempotencyKey = Guid.NewGuid().ToString(),
            Configuration = JsonDocument.Parse("{}"),
            CreatedAt = lastPlayedAt,
            LastPlayedAt = lastPlayedAt,
            CompletedAt = completedAt,
            IntendedPlayersCount = intendedPlayersCount
        };
        db.Games.Add(game);
        await db.SaveChangesAsync();
        return game;
    }

    private static async Task AddMembershipAsync(
        ApplicationDbContext db, Guid gameId, string userId, DateTimeOffset lastPlayedAt)
    {
        db.GameMembers.Add(new GameMember
        {
            GameId = gameId,
            UserId = userId,
            JoinedAt = lastPlayedAt,
            LastPlayedAt = lastPlayedAt
        });
        await db.SaveChangesAsync();
    }

    private static ApplicationDbContext CreateInMemoryDb()
    {
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        return new ApplicationDbContext(options);
    }

    private static GameSessions CreateSessions(Func<string>? generateInviteCode = null)
    {
        var meterFactory = new ServiceCollection().AddMetrics().BuildServiceProvider()
            .GetRequiredService<IMeterFactory>();
        return new GameSessions(meterFactory, generateInviteCode);
    }

    private static (
        Mock<IHubContext<GameHub, IGameClient>> Hub, Mock<IGroupManager> Groups, Mock<IHubClients<IGameClient>> Clients)
        CreateMockHub()
    {
        var groups = new Mock<IGroupManager>();
        var clients = new Mock<IHubClients<IGameClient>>();
        var hub = new Mock<IHubContext<GameHub, IGameClient>>();
        hub.Setup(h => h.Groups).Returns(groups.Object);
        hub.Setup(h => h.Clients).Returns(clients.Object);
        return (hub, groups, clients);
    }

    private static Mock<UserManager<AppUser>> GetMockUserManager(params string[] userIds)
    {
        var mock = new Mock<UserManager<AppUser>>(
            new Mock<IUserStore<AppUser>>().Object,
#pragma warning disable CS8625 // Cannot convert null literal to non-nullable reference type.
            null,
            null,
            null,
            null,
            null,
            null,
            null,
            null);
#pragma warning restore CS8625 // Cannot convert null literal to non-nullable reference type.

        foreach (var userId in userIds.Length == 0 ? [LoggedInUser] : userIds)
        {
            mock
                .Setup(m => m.GetUserAsync(
                    It.Is<ClaimsPrincipal>(p => p.HasClaim(ClaimTypes.NameIdentifier, userId))))
                .ReturnsAsync(new AppUser { Id = userId, UserName = Guid.NewGuid().ToString(), IsAnonymous = true });
        }

        return mock;
    }

    private static ClaimsPrincipal PrincipalFor(string userId) =>
        new(new ClaimsIdentity([new Claim(ClaimTypes.NameIdentifier, userId)]));

    private const string LoggedInUser = "4139F1EA-4901-4253-A391-021FAA001677";
    private const string OtherUser = "B6E3B6BF-EFFF-4B94-9E13-2E27FFF3C7CE";

    private static readonly ClaimsPrincipal LoggedInPrincipal = PrincipalFor(LoggedInUser);
    private static readonly ClaimsPrincipal OtherPrincipal = PrincipalFor(OtherUser);

    private static readonly DateTimeOffset FixedNow = new(2026, 1, 1, 0, 0, 0, TimeSpan.Zero);
    private static readonly TimeProvider FixedTimeProvider = new FixedTimeProviderImpl();

    private sealed class FixedTimeProviderImpl : TimeProvider
    {
        public override DateTimeOffset GetUtcNow() => FixedNow;
    }
}
