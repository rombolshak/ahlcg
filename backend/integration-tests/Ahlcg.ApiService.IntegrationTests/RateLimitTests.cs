using System.Net;
using System.Net.Http.Json;
using Tablier;
using Tablier.Data;

namespace Ahlcg.ApiService.IntegrationTests;

// One test on purpose: both limits draw on the same per-IP account-creation window.
[Collection(DefaultLimitsAppCollection.Name)]
public class RateLimitTests(DefaultLimitsAppFixture fixture)
{
    [Fact]
    public async Task PostGamesJoin_And_LoginAnonymously_AreThrottledIndependently()
    {
        using var accountA = fixture.CreateClient();
        var loginA = await accountA.PostAsync("/auth/loginAnonymously", null);
        loginA.EnsureSuccessStatusCode();

        for (var attempt = 0; attempt < 5; attempt++)
        {
            var response = await PostJoinAsync(accountA, "ZZZZZZ");
            Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        }

        var throttledJoin = await PostJoinAsync(accountA, "ZZZZZZ");
        Assert.Equal(HttpStatusCode.TooManyRequests, throttledJoin.StatusCode);

        for (var account = 0; account < 4; account++)
        {
            using var client = fixture.CreateClient();
            var response = await client.PostAsync("/auth/loginAnonymously", null);
            response.EnsureSuccessStatusCode();
        }

        using var sixthAccount = fixture.CreateClient();
        var throttledCreation = await sixthAccount.PostAsync("/auth/loginAnonymously", null);
        Assert.Equal(HttpStatusCode.TooManyRequests, throttledCreation.StatusCode);
    }

    private static Task<HttpResponseMessage> PostJoinAsync(HttpClient client, string code) =>
        client.PostAsJsonAsync("/games/join", new GameEndpoints.JoinGameRequest(code));
}
