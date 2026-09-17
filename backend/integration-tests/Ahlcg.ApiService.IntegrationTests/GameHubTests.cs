using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Ahlcg.ApiService;
using Microsoft.AspNetCore.SignalR.Client;
using Microsoft.EntityFrameworkCore;

namespace Ahlcg.ApiService.IntegrationTests;

/// <summary>
/// Drives GameHub over a real SignalR connection against the real Aspire-orchestrated app.
/// <c>OnConnectedAsync</c>/<c>OnDisconnectedAsync</c> read the game id from the query string via
/// <c>HubCallerContext.GetHttpContext()</c>, whose backing feature type is not public API, so the
/// connection lifecycle cannot be exercised at the unit tier at all - only here.
/// </summary>
[Collection(AppCollection.Name)]
public class GameHubTests(AppFixture fixture)
{
    [Fact]
    public async Task Connect_Member_ConnectsAndAnnouncesTheMember()
    {
        var cookies = new CookieContainer();
        using var client = fixture.CreateClient(cookies);
        var userId = await LoginAnonymouslyAsync(client);
        var gameId = await CreateGameAsync(client);

        await using var connection = BuildConnection(cookies, $"gameId={gameId}");
        var announced = new TaskCompletionSource<string>(TaskCreationOptions.RunContinuationsAsynchronously);
        connection.On<string>("MemberConnected", id => announced.TrySetResult(id));

        await connection.StartAsync();

        Assert.Equal(HubConnectionState.Connected, connection.State);
        Assert.Equal(userId, await WithTimeoutAsync(announced.Task));
    }

    [Fact]
    public async Task Connect_NonMember_IsRefused()
    {
        var ownerCookies = new CookieContainer();
        using var owner = fixture.CreateClient(ownerCookies);
        await LoginAnonymouslyAsync(owner);
        var gameId = await CreateGameAsync(owner);

        var outsiderCookies = new CookieContainer();
        using var outsider = fixture.CreateClient(outsiderCookies);
        await LoginAnonymouslyAsync(outsider);

        await using var connection = BuildConnection(outsiderCookies, $"gameId={gameId}");
        var exited = new TaskCompletionSource<string>(TaskCreationOptions.RunContinuationsAsynchronously);
        connection.On<string>("Exit", reason => exited.TrySetResult(reason));

        await connection.StartAsync();

        Assert.Equal(HubConnectionState.Connected, connection.State);
        Assert.Equal("NotAMember", await WithTimeoutAsync(exited.Task));
    }

    [Fact]
    public async Task Connect_MissingGameId_IsRefused()
    {
        var cookies = new CookieContainer();
        using var client = fixture.CreateClient(cookies);
        await LoginAnonymouslyAsync(client);

        await using var connection = BuildConnection(cookies, query: null);

        var error = await StartAndWaitForCloseAsync(connection);

        Assert.NotNull(error);
    }

    [Fact]
    public async Task Connect_WithoutCookie_IsRefused()
    {
        var gameId = Guid.NewGuid();

        await using var connection = BuildConnection(new CookieContainer(), $"gameId={gameId}");

        await Assert.ThrowsAnyAsync<Exception>(() => connection.StartAsync());
    }

    [Fact]
    public async Task Disconnect_Member_WritesLastPlayedAt()
    {
        var cookies = new CookieContainer();
        using var client = fixture.CreateClient(cookies);
        var userId = await LoginAnonymouslyAsync(client);
        var gameId = await CreateGameAsync(client);
        var joinedAt = await ReadLastPlayedAtAsync(gameId, userId);

        await using (var connection = BuildConnection(cookies, $"gameId={gameId}"))
        {
            await connection.StartAsync();
            await connection.StopAsync();
        }

        var lastPlayedAt = await WaitForLastPlayedAtAfterAsync(gameId, userId, joinedAt);
        Assert.True(lastPlayedAt > joinedAt, $"expected {lastPlayedAt:O} to be later than {joinedAt:O}");
    }

    private HubConnection BuildConnection(CookieContainer cookies, string? query)
    {
        var url = new Uri(fixture.ApiBaseAddress, query is null ? "game" : $"game?{query}");
        return new HubConnectionBuilder()
            .WithUrl(url, options =>
            {
                options.Cookies = cookies;
                options.HttpMessageHandlerFactory = _ => new HttpClientHandler
                {
                    CookieContainer = cookies,
                    ServerCertificateCustomValidationCallback =
                        HttpClientHandler.DangerousAcceptAnyServerCertificateValidator
                };
                options.WebSocketConfiguration = socket =>
                    socket.RemoteCertificateValidationCallback = (_, _, _, _) => true;
            })
            .Build();
    }

    private static async Task<Guid> CreateGameAsync(HttpClient client)
    {
        using var request = new HttpRequestMessage(HttpMethod.Post, "/games")
        {
            Content = JsonContent.Create(
                new GameEndpoints.CreateGameRequest(JsonDocument.Parse("""{"hub":true}""").RootElement.Clone()),
                options: JsonSerializerOptions.Web)
        };
        request.Headers.Add("Idempotency-Key", $"hub-{Guid.NewGuid()}");

        var response = await client.SendAsync(request);
        response.EnsureSuccessStatusCode();

        var dto = await response.Content.ReadFromJsonAsync<GameEndpoints.GameDto>(JsonSerializerOptions.Web);
        Assert.NotNull(dto);
        return dto.Id;
    }

    private async Task<DateTimeOffset> ReadLastPlayedAtAsync(Guid gameId, string userId)
    {
        await using var db = fixture.CreateDbContext();
        var member = await db.GameMembers
            .AsNoTracking()
            .SingleAsync(m => m.GameId == gameId && m.UserId == userId);
        return member.LastPlayedAt;
    }

    private async Task<DateTimeOffset> WaitForLastPlayedAtAfterAsync(
        Guid gameId, string userId, DateTimeOffset previous)
    {
        var deadline = DateTime.UtcNow.AddSeconds(15);
        var lastPlayedAt = previous;
        while (DateTime.UtcNow < deadline)
        {
            lastPlayedAt = await ReadLastPlayedAtAsync(gameId, userId);
            if (lastPlayedAt > previous) return lastPlayedAt;
            await Task.Delay(200);
        }

        return lastPlayedAt;
    }

    /// <summary>
    /// Starts <paramref name="connection"/> and returns the error it is then closed with. A hub
    /// that rejects a caller in <c>OnConnectedAsync</c> cannot fail the handshake - SignalR has
    /// already completed it by then - so refusal is observable only as a close that follows.
    /// </summary>
    private static async Task<Exception?> StartAndWaitForCloseAsync(HubConnection connection)
    {
        var closed = new TaskCompletionSource<Exception?>(TaskCreationOptions.RunContinuationsAsynchronously);
        connection.Closed += error =>
        {
            closed.TrySetResult(error);
            return Task.CompletedTask;
        };

        await connection.StartAsync();

        return await WithTimeoutAsync(closed.Task);
    }

    private static async Task<T> WithTimeoutAsync<T>(Task<T> task)
    {
        var completed = await Task.WhenAny(task, Task.Delay(TimeSpan.FromSeconds(15)));
        Assert.Same(task, completed);
        return await task;
    }

    /// <summary>
    /// Logs an anonymous session in on <paramref name="client"/> and returns the id of the user
    /// created for it, found as the row that appeared in AspNetUsers as a side effect of the call.
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
