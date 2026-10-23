using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.AspNetCore.SignalR.Client;
using Microsoft.EntityFrameworkCore;
using Tablier;
using Tablier.Data;

namespace Ahlcg.ApiService.IntegrationTests;

internal static class HubTestSupport
{
    public static HubConnection BuildConnection(AppFixtureBase fixture, CookieContainer cookies, string? query)
    {
        var url = new Uri(fixture.ApiBaseAddress, query is null ? "game" : $"game?{query}");
        return new HubConnectionBuilder()
            .WithUrl(
                url,
                options =>
                {
                    options.Cookies = cookies;
                    options.HttpMessageHandlerFactory = _ => new HttpClientHandler
                    {
                        CookieContainer = cookies,
                        ServerCertificateCustomValidationCallback =
                            HttpClientHandler.DangerousAcceptAnyServerCertificateValidator,
                    };
                    options.WebSocketConfiguration = socket =>
                        socket.RemoteCertificateValidationCallback = (_, _, _, _) => true;
                }
            )
            .Build();
    }

    public static async Task<Guid> CreateGameAsync(HttpClient client)
    {
        using var request = new HttpRequestMessage(HttpMethod.Post, "/games")
        {
            Content = JsonContent.Create(
                new GameEndpoints.CreateGameRequest(JsonDocument.Parse("""{"hub":true}""").RootElement.Clone()),
                options: JsonSerializerOptions.Web
            ),
        };
        request.Headers.Add("Idempotency-Key", $"hub-{Guid.NewGuid()}");

        var response = await client.SendAsync(request);
        response.EnsureSuccessStatusCode();

        var dto = await response.Content.ReadFromJsonAsync<GameEndpoints.GameDto>(JsonSerializerOptions.Web);
        Assert.NotNull(dto);
        return dto.Id;
    }

    public static async Task AddMembershipAsync(AppFixtureBase fixture, Guid gameId, string userId)
    {
        await using var db = fixture.CreateDbContext();
        var now = DateTimeOffset.UtcNow;
        db.GameMembers.Add(
            new GameMember
            {
                GameId = gameId,
                UserId = userId,
                JoinedAt = now,
                LastPlayedAt = now,
            }
        );
        await db.SaveChangesAsync();
    }

    public static async Task<T> WithTimeoutAsync<T>(Task<T> task)
    {
        var completed = await Task.WhenAny(task, Task.Delay(TimeSpan.FromSeconds(15)));
        Assert.Same(task, completed);
        return await task;
    }

    public static async Task<string> LoginAnonymouslyAsync(AppFixtureBase fixture, HttpClient client)
    {
        await using var before = fixture.CreateDbContext();
        var beforeIds = await before.Users.Select(u => u.Id).ToListAsync();

        var response = await client.PostAsync("/auth/loginAnonymously", content: null);
        response.EnsureSuccessStatusCode();

        await using var after = fixture.CreateDbContext();
        var afterIds = await after.Users.Select(u => u.Id).ToListAsync();

        return afterIds.Except(beforeIds).Single();
    }
}
