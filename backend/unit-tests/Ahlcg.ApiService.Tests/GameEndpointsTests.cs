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
    public async Task CreateGame_NotLoggedIn_ReturnsUnauthorized()
    {
        var userManager = GetMockUserManager();
        await using var db = CreateInMemoryDb();

        var result = await GameEndpoints.CreateGame(
            NotAuthenticatedPrincipal,
            userManager.Object,
            db,
            FixedTimeProvider,
            "idempotency-key",
            new GameEndpoints.CreateGameRequest(ParseConfiguration("""{"foo":"bar"}""")));

        Assert.IsType<UnauthorizedHttpResult>(result.Result);
        Assert.Empty(db.Games);
    }

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
    }

    [Fact]
    public async Task CreateGame_LoggedIn_ReturnsConfigurationUnchanged()
    {
        var userManager = GetMockUserManager();
        await using var db = CreateInMemoryDb();
        const string json = """{"nested":{"array":[1,2,3]},"value":"hello"}""";

        var result = await GameEndpoints.CreateGame(
            LoggedInPrincipal,
            userManager.Object,
            db,
            FixedTimeProvider,
            "idempotency-key",
            new GameEndpoints.CreateGameRequest(ParseConfiguration(json)));

        var ok = Assert.IsType<Ok<GameEndpoints.GameDto>>(result.Result);
        using var expected = JsonDocument.Parse(json);
        Assert.True(JsonElement.DeepEquals(expected.RootElement, ok.Value!.Configuration));
    }

    private static JsonElement ParseConfiguration(string json) => JsonDocument.Parse(json).RootElement.Clone();

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

    private static readonly ClaimsPrincipal NotAuthenticatedPrincipal = new(new ClaimsIdentity());

    private static readonly ClaimsPrincipal LoggedInPrincipal =
        new(new ClaimsIdentity([new Claim(ClaimTypes.NameIdentifier, LoggedInUser)]));

    private static readonly DateTimeOffset FixedNow = new(2026, 1, 1, 0, 0, 0, TimeSpan.Zero);
    private static readonly TimeProvider FixedTimeProvider = new FixedTimeProviderImpl();

    private sealed class FixedTimeProviderImpl : TimeProvider
    {
        public override DateTimeOffset GetUtcNow() => FixedNow;
    }
}
