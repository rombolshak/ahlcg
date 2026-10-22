using System.Net;
using System.Text.Json;
using System.Text.Json.Nodes;
using Json.Patch;
using Microsoft.AspNetCore.SignalR.Client;
using Tablier;

namespace Ahlcg.ApiService.IntegrationTests;

[Collection(AppCollection.Name)]
public class GameStepLoopTests(AppFixture fixture)
{
    private static readonly string[] OfferedActions =
    [
        "shared:inc",
        "shared:dec",
        "secret:inc",
        "secret:dec",
        "reveal",
    ];

    [Fact]
    public async Task GetState_Member_ReturnsVersionViewAndEveryAction()
    {
        var cookies = new CookieContainer();
        using var client = fixture.CreateClient(cookies);
        await HubTestSupport.LoginAnonymouslyAsync(fixture, client);
        var gameId = await HubTestSupport.CreateGameAsync(client);
        await using var connection = HubTestSupport.BuildConnection(fixture, cookies, $"gameId={gameId}");
        await connection.StartAsync();

        var sync = await connection.InvokeAsync<JsonElement?>(nameof(GameHub.GetState));

        Assert.NotNull(sync);
        Assert.Equal(0, sync.Value.GetProperty("version").GetInt32());
        var view = sync.Value.GetProperty("view");
        Assert.Equal(0, view.GetProperty("shared").GetInt32());
        Assert.Equal(0, view.GetProperty("ownSecret").GetInt32());
        Assert.Equal(JsonValueKind.Null, view.GetProperty("revealed").ValueKind);
        var actions = sync.Value.GetProperty("actions").EnumerateObject().Select(a => a.Name);
        Assert.Equal(OfferedActions.Order(StringComparer.Ordinal), actions.Order(StringComparer.Ordinal));
    }

    [Fact]
    public async Task GetState_ActionPatches_TurnTheViewIntoTheViewAfterTheAction()
    {
        var cookies = new CookieContainer();
        using var client = fixture.CreateClient(cookies);
        await HubTestSupport.LoginAnonymouslyAsync(fixture, client);
        var gameId = await HubTestSupport.CreateGameAsync(client);
        await using var connection = HubTestSupport.BuildConnection(fixture, cookies, $"gameId={gameId}");
        await connection.StartAsync();
        var sync = await connection.InvokeAsync<JsonElement?>(nameof(GameHub.GetState));
        Assert.NotNull(sync);

        var shared = Apply(sync.Value, "shared:inc");
        var secret = Apply(sync.Value, "secret:inc");
        var reveal = Apply(sync.Value, "reveal");

        Assert.Equal(1, shared["shared"]!.GetValue<int>());
        Assert.Equal(1, secret["ownSecret"]!.GetValue<int>());
        Assert.Equal(0, reveal["shared"]!.GetValue<int>());
        Assert.Equal(0, reveal["ownSecret"]!.GetValue<int>());
        Assert.Null(reveal["revealed"]);
    }

    [Fact]
    public async Task GetState_NonMember_ReturnsNull()
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
        await HubTestSupport.WithTimeoutAsync(exited.Task);

        var sync = await connection.InvokeAsync<JsonElement?>(nameof(GameHub.GetState));

        Assert.Null(sync);
        Assert.Equal(HubConnectionState.Connected, connection.State);
    }

    private static JsonNode Apply(JsonElement sync, string action)
    {
        var view = JsonNode.Parse(sync.GetProperty("view").GetRawText())!;
        var patch = sync.GetProperty("actions").GetProperty(action).Deserialize<JsonPatch>()!;
        var result = patch.Apply(view);
        Assert.True(result.IsSuccess, result.Error);
        return result.Result!;
    }
}
