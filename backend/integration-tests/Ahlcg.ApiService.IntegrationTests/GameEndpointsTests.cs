using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Ahlcg.ApiService;
using Microsoft.EntityFrameworkCore;

namespace Ahlcg.ApiService.IntegrationTests;

/// <summary>
/// Drives POST /games over real HTTP against the real Aspire-orchestrated app and Postgres.
/// EF's InMemory provider (used by the unit tests) does not enforce unique indexes, so the
/// idempotency criteria can only be proven here.
/// </summary>
[Collection(AppCollection.Name)]
public class GameEndpointsTests(AppFixture fixture)
{
    [Fact]
    public async Task PostGames_WithoutCookie_ReturnsUnauthorized()
    {
        using var client = fixture.CreateClient();

        var response = await PostGameAsync(client, "unauth-key", """{"foo":"bar"}""");

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task PostGames_WithoutIdempotencyKeyHeader_ReturnsBadRequest()
    {
        using var client = fixture.CreateClient();
        await LoginAnonymouslyAsync(client);

        using var request = new HttpRequestMessage(HttpMethod.Post, "/games")
        {
            Content = JsonContent.Create(
                new GameEndpoints.CreateGameRequest(ParseConfig("""{"foo":"bar"}""")),
                options: JsonSerializerOptions.Web)
        };
        var response = await client.SendAsync(request);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task PostGames_Authenticated_CreatesGameOwnedByCaller()
    {
        using var client = fixture.CreateClient();
        var userId = await LoginAnonymouslyAsync(client);

        var response = await PostGameAsync(client, $"owner-{Guid.NewGuid()}", """{"foo":"bar"}""");
        response.EnsureSuccessStatusCode();
        var dto = await ReadGameAsync(response);

        await using var db = fixture.CreateDbContext();
        var stored = await db.Games.AsNoTracking().SingleAsync(g => g.Id == dto.Id);
        Assert.Equal(userId, stored.OwnerId);
    }

    [Fact]
    public async Task PostGames_SameKeyTwiceSameUser_ReturnsSameGameAndCreatesOneRow()
    {
        using var client = fixture.CreateClient();
        await LoginAnonymouslyAsync(client);
        var key = $"same-user-{Guid.NewGuid()}";

        var first = await PostGameAsync(client, key, """{"a":1}""");
        first.EnsureSuccessStatusCode();
        var firstDto = await ReadGameAsync(first);

        var second = await PostGameAsync(client, key, """{"a":1}""");
        second.EnsureSuccessStatusCode();
        var secondDto = await ReadGameAsync(second);

        Assert.Equal(firstDto.Id, secondDto.Id);

        await using var db = fixture.CreateDbContext();
        var count = await db.Games.CountAsync(g => g.IdempotencyKey == key);
        Assert.Equal(1, count);
    }

    [Fact]
    public async Task PostGames_SameKeyDifferentUsers_CreatesTwoGames()
    {
        using var clientA = fixture.CreateClient();
        using var clientB = fixture.CreateClient();
        await LoginAnonymouslyAsync(clientA);
        await LoginAnonymouslyAsync(clientB);
        var key = $"shared-{Guid.NewGuid()}";

        var responseA = await PostGameAsync(clientA, key, """{"a":1}""");
        var responseB = await PostGameAsync(clientB, key, """{"a":1}""");
        responseA.EnsureSuccessStatusCode();
        responseB.EnsureSuccessStatusCode();

        var dtoA = await ReadGameAsync(responseA);
        var dtoB = await ReadGameAsync(responseB);

        Assert.NotEqual(dtoA.Id, dtoB.Id);

        await using var db = fixture.CreateDbContext();
        var count = await db.Games.CountAsync(g => g.IdempotencyKey == key);
        Assert.Equal(2, count);
    }

    [Fact]
    public async Task PostGames_Authenticated_ReturnsConfigurationUnchanged()
    {
        using var client = fixture.CreateClient();
        await LoginAnonymouslyAsync(client);
        const string json = """{"nested":{"array":[1,2,3]},"value":"hello"}""";

        var response = await PostGameAsync(client, $"config-{Guid.NewGuid()}", json);
        response.EnsureSuccessStatusCode();
        var dto = await ReadGameAsync(response);

        using var expected = JsonDocument.Parse(json);
        Assert.True(JsonElement.DeepEquals(expected.RootElement, dto.Configuration));
    }

    [Fact]
    public async Task OpenApi_DescribesPostGames()
    {
        using var client = fixture.CreateClient();

        var response = await client.GetAsync("/openapi/v1.json");
        response.EnsureSuccessStatusCode();

        using var document = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        var post = document.RootElement.GetProperty("paths").GetProperty("/games").GetProperty("post");

        Assert.False(string.IsNullOrWhiteSpace(post.GetProperty("description").GetString()));
    }

    private static JsonElement ParseConfig(string json) => JsonDocument.Parse(json).RootElement.Clone();

    private static async Task<HttpResponseMessage> PostGameAsync(
        HttpClient client, string idempotencyKey, string configurationJson)
    {
        using var request = new HttpRequestMessage(HttpMethod.Post, "/games")
        {
            Content = JsonContent.Create(
                new GameEndpoints.CreateGameRequest(ParseConfig(configurationJson)),
                options: JsonSerializerOptions.Web)
        };
        request.Headers.Add("Idempotency-Key", idempotencyKey);
        return await client.SendAsync(request);
    }

    private static async Task<GameEndpoints.GameDto> ReadGameAsync(HttpResponseMessage response)
    {
        var dto = await response.Content.ReadFromJsonAsync<GameEndpoints.GameDto>(JsonSerializerOptions.Web);
        Assert.NotNull(dto);
        return dto;
    }

    /// <summary>
    /// Logs an anonymous session in on <paramref name="client"/> and returns the id of the user
    /// that was created for it, found as the row that appeared in AspNetUsers as a side effect
    /// of this call. Safe because the fixture's Postgres is exclusive to this test run and tests
    /// in this class run sequentially (shared collection fixture).
    /// </summary>
    private async Task<string> LoginAnonymouslyAsync(HttpClient client)
    {
        await using var before = fixture.CreateDbContext();
        var beforeIds = await before.Users.Select(u => u.Id).ToListAsync();

        var response = await client.PostAsync("/auth/loginAnonymously", null);
        response.EnsureSuccessStatusCode();

        await using var after = fixture.CreateDbContext();
        var afterIds = await after.Users.Select(u => u.Id).ToListAsync();

        return afterIds.Except(beforeIds).Single();
    }
}
