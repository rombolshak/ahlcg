using System.Security.Claims;
using System.Text.Json;
using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
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
    public async Task ListGames_NoMemberships_ReturnsEmptyList()
    {
        var userManager = GetMockUserManager();
        await using var db = CreateInMemoryDb();

        var result = await GameEndpoints.ListGames(LoggedInPrincipal, userManager.Object, db);

        var ok = Assert.IsType<Ok<IReadOnlyList<GameEndpoints.GameDto>>>(result.Result);
        Assert.Empty(ok.Value!);
    }

    [Fact]
    public async Task ListGames_OtherUsersGame_IsNotReturned()
    {
        var userManager = GetMockUserManager();
        await using var db = CreateInMemoryDb();
        var game = await SeedGameAsync(db, OtherUser, FixedNow);
        await AddMembershipAsync(db, game.Id, OtherUser, FixedNow);

        var result = await GameEndpoints.ListGames(LoggedInPrincipal, userManager.Object, db);

        var ok = Assert.IsType<Ok<IReadOnlyList<GameEndpoints.GameDto>>>(result.Result);
        Assert.Empty(ok.Value!);
    }

    [Fact]
    public async Task ListGames_GameOwnedByCallerWithoutMembership_IsNotReturned()
    {
        var userManager = GetMockUserManager();
        await using var db = CreateInMemoryDb();
        await SeedGameAsync(db, LoggedInUser, FixedNow);

        var result = await GameEndpoints.ListGames(LoggedInPrincipal, userManager.Object, db);

        var ok = Assert.IsType<Ok<IReadOnlyList<GameEndpoints.GameDto>>>(result.Result);
        Assert.Empty(ok.Value!);
    }

    [Fact]
    public async Task ListGames_GameCallerDidNotCreate_IsReturned()
    {
        var userManager = GetMockUserManager();
        await using var db = CreateInMemoryDb();
        var game = await SeedGameAsync(db, OtherUser, FixedNow);
        await AddMembershipAsync(db, game.Id, LoggedInUser, FixedNow);

        var result = await GameEndpoints.ListGames(LoggedInPrincipal, userManager.Object, db);

        var ok = Assert.IsType<Ok<IReadOnlyList<GameEndpoints.GameDto>>>(result.Result);
        var returned = Assert.Single(ok.Value!);
        Assert.Equal(game.Id, returned.Id);
    }

    [Fact]
    public async Task ListGames_OrdersByCallersOwnLastPlayedAt()
    {
        var userManager = GetMockUserManager();
        await using var db = CreateInMemoryDb();
        var olderGame = await SeedGameAsync(db, OtherUser, FixedNow.AddDays(2));
        await AddMembershipAsync(db, olderGame.Id, LoggedInUser, FixedNow);
        await AddMembershipAsync(db, olderGame.Id, OtherUser, FixedNow.AddDays(2));
        var newerGame = await SeedGameAsync(db, OtherUser, FixedNow.AddDays(1));
        await AddMembershipAsync(db, newerGame.Id, LoggedInUser, FixedNow.AddDays(3));
        await AddMembershipAsync(db, newerGame.Id, OtherUser, FixedNow.AddDays(1));

        var result = await GameEndpoints.ListGames(LoggedInPrincipal, userManager.Object, db);

        var ok = Assert.IsType<Ok<IReadOnlyList<GameEndpoints.GameDto>>>(result.Result);
        Assert.Equal([newerGame.Id, olderGame.Id], ok.Value!.Select(g => g.Id));
    }

    private static JsonElement ParseConfiguration(string json) => JsonDocument.Parse(json).RootElement.Clone();

    private static async Task<Game> SeedGameAsync(
        ApplicationDbContext db, string ownerId, DateTimeOffset lastPlayedAt)
    {
        var game = new Game
        {
            OwnerId = ownerId,
            IdempotencyKey = Guid.NewGuid().ToString(),
            Configuration = JsonDocument.Parse("{}"),
            CreatedAt = lastPlayedAt,
            LastPlayedAt = lastPlayedAt
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

    private static Mock<UserManager<AppUser>> GetMockUserManager()
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

        mock
            .Setup(m => m.GetUserAsync(
                It.Is<ClaimsPrincipal>(p => p.HasClaim(ClaimTypes.NameIdentifier, LoggedInUser))))
            .ReturnsAsync(new AppUser { Id = LoggedInUser, UserName = Guid.NewGuid().ToString(), IsAnonymous = true });

        return mock;
    }

    private const string LoggedInUser = "4139F1EA-4901-4253-A391-021FAA001677";
    private const string OtherUser = "B6E3B6BF-EFFF-4B94-9E13-2E27FFF3C7CE";

    private static readonly ClaimsPrincipal LoggedInPrincipal =
        new(new ClaimsIdentity([new Claim(ClaimTypes.NameIdentifier, LoggedInUser)]));

    private static readonly DateTimeOffset FixedNow = new(2026, 1, 1, 0, 0, 0, TimeSpan.Zero);
    private static readonly TimeProvider FixedTimeProvider = new FixedTimeProviderImpl();

    private sealed class FixedTimeProviderImpl : TimeProvider
    {
        public override DateTimeOffset GetUtcNow() => FixedNow;
    }
}
