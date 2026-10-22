using System.Net;
using System.Text.Json;
using System.Text.Json.Nodes;
using System.Threading.Channels;
using Json.Patch;
using Microsoft.AspNetCore.SignalR.Client;
using Microsoft.EntityFrameworkCore;
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

    [Fact]
    public async Task Execute_OfferedAction_CommitsAndSendsStateChanged()
    {
        await using var game = await StartGameAsync();
        var sync = await game.GetStateAsync();

        var executed = await game.Connection.InvokeAsync<bool>(nameof(GameHub.Execute), "shared:inc");

        Assert.True(executed);
        var change = await game.NextChangeAsync();
        Assert.Equal(1, change.GetProperty("version").GetInt32());
        Assert.Equal(1, ApplyView(sync, change)["shared"]!.GetValue<int>());
        var actions = change.GetProperty("actions").EnumerateObject().Select(a => a.Name);
        Assert.Equal(OfferedActions.Order(StringComparer.Ordinal), actions.Order(StringComparer.Ordinal));
    }

    [Theory]
    [InlineData("shared:inc")]
    [InlineData("shared:dec")]
    [InlineData("secret:inc")]
    [InlineData("secret:dec")]
    [InlineData("reveal")]
    public async Task Execute_Action_ProducesTheViewItsPatchPromised(string action)
    {
        await using var game = await StartGameAsync();
        var sync = await game.GetStateAsync();
        var promised = Apply(sync, action);

        await game.Connection.InvokeAsync<bool>(nameof(GameHub.Execute), action);

        var firstChange = await game.NextChangeAsync();
        var actual =
            action == "reveal"
                ? ApplyView(sync, firstChange)
                : JsonNode.Parse((await game.GetStateAsync()).GetProperty("view").GetRawText())!;
        Assert.True(JsonNode.DeepEquals(promised, actual));
    }

    [Fact]
    public async Task Execute_ActionNotOffered_ReturnsFalseAndChangesNothing()
    {
        await using var game = await StartGameAsync();

        var executed = await game.Connection.InvokeAsync<bool>(nameof(GameHub.Execute), "nope");

        Assert.False(executed);
        Assert.False(await game.HasChangeWithinAsync(TimeSpan.FromMilliseconds(500)));
        await using var db = fixture.CreateDbContext();
        Assert.False(await db.GameSteps.AnyAsync(s => s.GameId == game.GameId));
    }

    [Fact]
    public async Task Execute_Reveal_SendsThePendingVersionThenTheAdvancedOne()
    {
        await using var game = await StartGameAsync();
        var sync = await game.GetStateAsync();

        var executed = await game.Connection.InvokeAsync<bool>(nameof(GameHub.Execute), "reveal");

        Assert.True(executed);
        var pending = await game.NextChangeAsync();
        var advanced = await game.NextChangeAsync();
        Assert.Equal(1, pending.GetProperty("version").GetInt32());
        Assert.Empty(pending.GetProperty("actions").EnumerateObject());
        Assert.Equal(2, advanced.GetProperty("version").GetInt32());
        var revealed = ApplyView(sync, pending, advanced)["revealed"]!.GetValue<int>();
        Assert.InRange(revealed, 1, 6);
        var actions = advanced.GetProperty("actions").EnumerateObject().Select(a => a.Name);
        Assert.Equal(OfferedActions.Order(StringComparer.Ordinal), actions.Order(StringComparer.Ordinal));
    }

    [Fact]
    public async Task Execute_ConcurrentConnections_CommitConsecutiveVersions()
    {
        await using var first = await StartGameAsync();
        await using var second = await first.ConnectAgainAsync();

        var results = await Task.WhenAll(
            first.Connection.InvokeAsync<bool>(nameof(GameHub.Execute), "shared:inc"),
            second.Connection.InvokeAsync<bool>(nameof(GameHub.Execute), "shared:inc")
        );

        Assert.All(results, Assert.True);
        await using var db = fixture.CreateDbContext();
        var versions = await db
            .GameSteps.Where(s => s.GameId == first.GameId)
            .OrderBy(s => s.Version)
            .Select(s => s.Version)
            .ToListAsync();
        Assert.Equal([1, 2], versions);
        var sync = await first.GetStateAsync();
        Assert.Equal(2, sync.GetProperty("version").GetInt32());
        Assert.Equal(2, sync.GetProperty("view").GetProperty("shared").GetInt32());
    }

    [Fact]
    public async Task Sync_AfterExecute_ReportsTheLatestCommittedVersion()
    {
        await using var game = await StartGameAsync();
        await game.Connection.InvokeAsync<bool>(nameof(GameHub.Execute), "reveal");
        await game.Connection.InvokeAsync<bool>(nameof(GameHub.Execute), "shared:inc");

        var sync = await game.GetStateAsync();

        await using var db = fixture.CreateDbContext();
        var latest = await db.GameSteps.Where(s => s.GameId == game.GameId).MaxAsync(s => s.Version);
        Assert.Equal(latest, sync.GetProperty("version").GetInt32());
    }

    private async Task<GameRun> StartGameAsync()
    {
        var cookies = new CookieContainer();
        using var client = fixture.CreateClient(cookies);
        await HubTestSupport.LoginAnonymouslyAsync(fixture, client);
        var gameId = await HubTestSupport.CreateGameAsync(client);
        return await GameRun.ConnectAsync(fixture, cookies, gameId);
    }

    private sealed class GameRun : IAsyncDisposable
    {
        private readonly AppFixture _fixture;
        private readonly CookieContainer _cookies;
        private readonly Channel<JsonElement> _changes = Channel.CreateUnbounded<JsonElement>();

        private GameRun(AppFixture fixture, CookieContainer cookies, Guid gameId, HubConnection connection)
        {
            _fixture = fixture;
            _cookies = cookies;
            GameId = gameId;
            Connection = connection;
            connection.On<JsonElement>(nameof(IGameClient.StateChanged), change => _changes.Writer.TryWrite(change));
        }

        public Guid GameId { get; }

        public HubConnection Connection { get; }

        public static async Task<GameRun> ConnectAsync(AppFixture fixture, CookieContainer cookies, Guid gameId)
        {
            var connection = HubTestSupport.BuildConnection(fixture, cookies, $"gameId={gameId}");
            var run = new GameRun(fixture, cookies, gameId, connection);
            await connection.StartAsync();
            return run;
        }

        public Task<GameRun> ConnectAgainAsync() => ConnectAsync(_fixture, _cookies, GameId);

        public async Task<JsonElement> GetStateAsync()
        {
            var sync = await Connection.InvokeAsync<JsonElement?>(nameof(GameHub.GetState));
            Assert.NotNull(sync);
            return sync.Value;
        }

        public async Task<JsonElement> NextChangeAsync() =>
            await HubTestSupport.WithTimeoutAsync(_changes.Reader.ReadAsync().AsTask());

        public async Task<bool> HasChangeWithinAsync(TimeSpan wait)
        {
            var read = _changes.Reader.ReadAsync().AsTask();
            return await Task.WhenAny(read, Task.Delay(wait)) == read;
        }

        public ValueTask DisposeAsync() => Connection.DisposeAsync();
    }

    private static JsonNode ApplyView(JsonElement sync, params JsonElement[] changes)
    {
        var view = JsonNode.Parse(sync.GetProperty("view").GetRawText())!;
        foreach (var change in changes)
        {
            var result = change.GetProperty("viewPatch").Deserialize<JsonPatch>()!.Apply(view);
            Assert.True(result.IsSuccess, result.Error);
            view = result.Result!;
        }

        return view;
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
