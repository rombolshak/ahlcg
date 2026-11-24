using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Ahlcg.ApiService.IntegrationTests.Fixture;
using Microsoft.EntityFrameworkCore;
using Tablier.Auth;

namespace Ahlcg.ApiService.IntegrationTests.Auth;

[Collection(AppCollection.Name)]
public class AuthInfoTests(AppFixture fixture)
{
    [Fact]
    public async Task GetInfo_AnonymousUpgrade_ReturnsStoredIdAndRefreshesSameSession()
    {
        var cookies = new CookieContainer();
        using var client = fixture.CreateClient(cookies);
        var persistedId = await HubTestSupport.LoginAnonymouslyAsync(fixture, client);
        await using var before = fixture.CreateDbContext();
        var anonymous = await before.Users.AsNoTracking().SingleAsync(u => u.Id == persistedId);
        var originalCookie = cookies.GetCookieHeader(fixture.ApiBaseAddress);

        using var anonymousInfo = JsonDocument.Parse(await client.GetStringAsync("/auth/info"));
        Assert.Equal(persistedId, anonymousInfo.RootElement.GetProperty("userId").GetString());
        Assert.Equal(anonymous.UserName, anonymousInfo.RootElement.GetProperty("userName").GetString());
        Assert.NotEqual(persistedId, anonymous.UserName);

        var email = $"auth-{Guid.NewGuid():N}@example.com";
        var upgrade = await client.PostAsJsonAsync(
            "/auth/signIn",
            new AuthEndpoints.RegisterRequest(email, $"user-{Guid.NewGuid():N}", "P@ssw0rd")
        );
        upgrade.EnsureSuccessStatusCode();

        Assert.Contains(upgrade.Headers.GetValues("Set-Cookie"), value =>
            value.StartsWith(".AspNetCore.Identity.Application=", StringComparison.Ordinal)
        );
        Assert.False(
            originalCookie == cookies.GetCookieHeader(fixture.ApiBaseAddress),
            "The session cookie must be refreshed."
        );
        await using var after = fixture.CreateDbContext();
        var permanent = await after.Users.AsNoTracking().SingleAsync(u => u.Email == email);
        Assert.Equal(persistedId, permanent.Id);
        Assert.False(
            anonymous.SecurityStamp == permanent.SecurityStamp,
            "Adding a password must rotate the security stamp."
        );

        using var permanentInfo = JsonDocument.Parse(await client.GetStringAsync("/auth/info"));
        Assert.Equal(permanent.Id, permanentInfo.RootElement.GetProperty("userId").GetString());
        Assert.Equal(permanent.UserName, permanentInfo.RootElement.GetProperty("userName").GetString());
        Assert.False(permanentInfo.RootElement.GetProperty("isAnonymous").GetBoolean());
    }

    [Fact]
    public async Task GetOpenApi_AuthInfo_RequiresStringUserId()
    {
        using var client = fixture.CreateClient();
        using var document = JsonDocument.Parse(await client.GetStringAsync("/openapi/v1.json"));
        var responseSchema = document
            .RootElement.GetProperty("paths")
            .GetProperty("/auth/info")
            .GetProperty("get")
            .GetProperty("responses")
            .GetProperty("200")
            .GetProperty("content")
            .GetProperty("application/json")
            .GetProperty("schema");
        var reference = responseSchema.GetProperty("$ref").GetString();
        Assert.NotNull(reference);
        var schemaName = reference.Split('/')[^1];
        var schema = document.RootElement.GetProperty("components").GetProperty("schemas").GetProperty(schemaName);

        Assert.Contains(schema.GetProperty("required").EnumerateArray(), property => property.GetString() == "userId");
        var userId = schema.GetProperty("properties").GetProperty("userId");
        Assert.Equal("string", userId.GetProperty("type").GetString());
        Assert.False(userId.TryGetProperty("format", out _));
    }
}
