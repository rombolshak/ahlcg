using System.Net;
using System.Text.Json;
using Microsoft.AspNetCore.SignalR.Client;
using Microsoft.EntityFrameworkCore;
using Tablier;

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
        var userId = await HubTestSupport.LoginAnonymouslyAsync(fixture, client);
        var gameId = await HubTestSupport.CreateGameAsync(client);

        await using var connection = HubTestSupport.BuildConnection(fixture, cookies, $"gameId={gameId}");
        var announced = new TaskCompletionSource<string>(TaskCreationOptions.RunContinuationsAsynchronously);
        connection.On<string>(nameof(IGameClient.MemberConnected), id => announced.TrySetResult(id));

        await connection.StartAsync();

        Assert.Equal(HubConnectionState.Connected, connection.State);
        Assert.Equal(userId, await HubTestSupport.WithTimeoutAsync(announced.Task));
    }

    [Fact]
    public async Task Connect_NonMember_IsRefused()
    {
        var ownerCookies = new CookieContainer();
        using var owner = fixture.CreateClient(ownerCookies);
        await HubTestSupport.LoginAnonymouslyAsync(fixture, owner);
        var gameId = await HubTestSupport.CreateGameAsync(owner);

        var outsiderCookies = new CookieContainer();
        using var outsider = fixture.CreateClient(outsiderCookies);
        await HubTestSupport.LoginAnonymouslyAsync(fixture, outsider);

        await using var connection = HubTestSupport.BuildConnection(fixture, outsiderCookies, $"gameId={gameId}");
        var exited = new TaskCompletionSource<string>(TaskCreationOptions.RunContinuationsAsynchronously);
        connection.On<string>(nameof(IGameClient.Exit), reason => exited.TrySetResult(reason));

        await connection.StartAsync();

        Assert.Equal(HubConnectionState.Connected, connection.State);
        Assert.Equal("NotAMember", await HubTestSupport.WithTimeoutAsync(exited.Task));
    }

    [Fact]
    public async Task Connect_MissingGameId_IsRefused()
    {
        var cookies = new CookieContainer();
        using var client = fixture.CreateClient(cookies);
        await HubTestSupport.LoginAnonymouslyAsync(fixture, client);

        await using var connection = HubTestSupport.BuildConnection(fixture, cookies, query: null);

        var error = await StartAndWaitForCloseAsync(connection);

        Assert.NotNull(error);
    }

    [Fact]
    public async Task Connect_WithoutCookie_IsRefused()
    {
        var gameId = Guid.NewGuid();

        await using var connection = HubTestSupport.BuildConnection(fixture, new CookieContainer(), $"gameId={gameId}");

        await Assert.ThrowsAnyAsync<Exception>(() => connection.StartAsync());
    }

    [Fact]
    public async Task Disconnect_Member_WritesLastPlayedAt()
    {
        var cookies = new CookieContainer();
        using var client = fixture.CreateClient(cookies);
        var userId = await HubTestSupport.LoginAnonymouslyAsync(fixture, client);
        var gameId = await HubTestSupport.CreateGameAsync(client);
        var joinedAt = await ReadLastPlayedAtAsync(gameId, userId);

        await using (var connection = HubTestSupport.BuildConnection(fixture, cookies, $"gameId={gameId}"))
        {
            await connection.StartAsync();
            await connection.StopAsync();
        }

        var lastPlayedAt = await WaitForLastPlayedAtAfterAsync(gameId, userId, joinedAt);
        Assert.True(lastPlayedAt > joinedAt, $"expected {lastPlayedAt:O} to be later than {joinedAt:O}");
    }

    [Fact]
    public async Task RemoveMember_ConnectedTarget_ExitsAndCannotReconnect()
    {
        var ownerCookies = new CookieContainer();
        using var owner = fixture.CreateClient(ownerCookies);
        await HubTestSupport.LoginAnonymouslyAsync(fixture, owner);
        var gameId = await HubTestSupport.CreateGameAsync(owner);

        var targetCookies = new CookieContainer();
        using var target = fixture.CreateClient(targetCookies);
        var targetId = await HubTestSupport.LoginAnonymouslyAsync(fixture, target);
        await HubTestSupport.AddMembershipAsync(fixture, gameId, targetId);

        await using var connection = HubTestSupport.BuildConnection(fixture, targetCookies, $"gameId={gameId}");
        var exited = new TaskCompletionSource<string>(TaskCreationOptions.RunContinuationsAsynchronously);
        connection.On<string>(nameof(IGameClient.Exit), reason => exited.TrySetResult(reason));
        await connection.StartAsync();

        var removeResponse = await owner.DeleteAsync($"/games/{gameId}/members/{targetId}");
        removeResponse.EnsureSuccessStatusCode();

        Assert.Equal("NotAMember", await HubTestSupport.WithTimeoutAsync(exited.Task));

        await using var reconnection = HubTestSupport.BuildConnection(fixture, targetCookies, $"gameId={gameId}");
        var exitedAgain = new TaskCompletionSource<string>(TaskCreationOptions.RunContinuationsAsynchronously);
        reconnection.On<string>(nameof(IGameClient.Exit), reason => exitedAgain.TrySetResult(reason));
        await reconnection.StartAsync();

        Assert.Equal("NotAMember", await HubTestSupport.WithTimeoutAsync(exitedAgain.Task));
    }

    [Fact]
    public async Task GetMembers_ReflectsConnectionState()
    {
        var cookies = new CookieContainer();
        using var client = fixture.CreateClient(cookies);
        var userId = await HubTestSupport.LoginAnonymouslyAsync(fixture, client);
        var gameId = await HubTestSupport.CreateGameAsync(client);

        await using (var connection = HubTestSupport.BuildConnection(fixture, cookies, $"gameId={gameId}"))
        {
            await connection.StartAsync();

            Assert.True(await WaitForOnlineStateAsync(client, gameId, userId, expected: true));

            await connection.StopAsync();
        }

        Assert.False(await WaitForOnlineStateAsync(client, gameId, userId, expected: false));
    }

    private static async Task<bool> WaitForOnlineStateAsync(
        HttpClient client,
        Guid gameId,
        string userId,
        bool expected
    )
    {
        var deadline = DateTime.UtcNow.AddSeconds(15);
        var online = !expected;
        while (DateTime.UtcNow < deadline)
        {
            online = await ReadOnlineStateAsync(client, gameId, userId);
            if (online == expected)
                return online;
            await Task.Delay(200);
        }

        return online;
    }

    private static async Task<bool> ReadOnlineStateAsync(HttpClient client, Guid gameId, string userId)
    {
        var response = await client.GetAsync($"/games/{gameId}/members");
        response.EnsureSuccessStatusCode();

        using var document = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        var member = document.RootElement.EnumerateArray().Single(m => m.GetProperty("userId").GetString() == userId);
        return member.GetProperty("isOnline").GetBoolean();
    }

    private async Task<DateTimeOffset> ReadLastPlayedAtAsync(Guid gameId, string userId)
    {
        await using var db = fixture.CreateDbContext();
        var member = await db.GameMembers.AsNoTracking().SingleAsync(m => m.GameId == gameId && m.UserId == userId);
        return member.LastPlayedAt;
    }

    private async Task<DateTimeOffset> WaitForLastPlayedAtAfterAsync(
        Guid gameId,
        string userId,
        DateTimeOffset previous
    )
    {
        var deadline = DateTime.UtcNow.AddSeconds(15);
        var lastPlayedAt = previous;
        while (DateTime.UtcNow < deadline)
        {
            lastPlayedAt = await ReadLastPlayedAtAsync(gameId, userId);
            if (lastPlayedAt > previous)
                return lastPlayedAt;
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

        return await HubTestSupport.WithTimeoutAsync(closed.Task);
    }
}
