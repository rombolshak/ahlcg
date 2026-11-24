using System.Net.Http.Json;
using System.Text.Json;
using Ahlcg.ApiService.IntegrationTests.Fixture;
using Microsoft.EntityFrameworkCore;
using Tablier.Auth;

namespace Ahlcg.ApiService.IntegrationTests.Auth;

[Collection(AppCollection.Name)]
public class AuthEndpointsTests(AppFixture fixture)
{
    [Fact]
    public async Task GetInfo_AnonymousUpgrade_ReturnsSameStoredIdWithoutSigningInAgain()
    {
        using var client = fixture.CreateClient();
        var persistedId = await HubTestSupport.LoginAnonymouslyAsync(fixture, client);

        using var anonymousInfo = JsonDocument.Parse(await client.GetStringAsync("/auth/info"));
        Assert.Equal(persistedId, anonymousInfo.RootElement.GetProperty("userId").GetString());
        Assert.True(anonymousInfo.RootElement.GetProperty("isAnonymous").GetBoolean());

        var email = $"auth-{Guid.NewGuid():N}@example.com";
        var upgrade = await client.PostAsJsonAsync(
            "/auth/signIn",
            new AuthEndpoints.RegisterRequest(email, $"user-{Guid.NewGuid():N}", "P@ssw0rd")
        );
        upgrade.EnsureSuccessStatusCode();

        await using var db = fixture.CreateDbContext();
        var permanent = await db.Users.AsNoTracking().SingleAsync(u => u.Email == email);
        Assert.Equal(persistedId, permanent.Id);

        using var permanentInfo = JsonDocument.Parse(await client.GetStringAsync("/auth/info"));
        Assert.Equal(permanent.Id, permanentInfo.RootElement.GetProperty("userId").GetString());
        Assert.False(permanentInfo.RootElement.GetProperty("isAnonymous").GetBoolean());
    }
}
