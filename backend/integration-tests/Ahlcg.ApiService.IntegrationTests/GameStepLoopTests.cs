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
    public async Task GetState_AfterExecute_ReportsTheLatestCommittedVersion()
    {
        await using var game = await StartGameAsync();
        await game.Connection.InvokeAsync<bool>(nameof(GameHub.Execute), "reveal");
        await game.Connection.InvokeAsync<bool>(nameof(GameHub.Execute), "shared:inc");

        var sync = await game.GetStateAsync();

        await using var db = fixture.CreateDbContext();
        var latest = await db.GameSteps.Where(s => s.GameId == game.GameId).MaxAsync(s => s.Version);
        Assert.Equal(latest, sync.GetProperty("version").GetInt32());
    }

    [Fact]
    public async Task GetState_MemberRowInsertedAfterCreation_ShowsTheirCounterAndTellsTheOwner()
    {
        await using var owner = await StartGameAsync();
        var ownerSync = await owner.GetStateAsync();
        await using var newcomer = await AddUnsyncedMemberAsync(owner);

        var sync = await newcomer.GetStateAsync();

        Assert.Equal(0, sync.GetProperty("view").GetProperty("ownSecret").GetInt32());
        var actions = sync.GetProperty("actions").EnumerateObject().Select(a => a.Name);
        Assert.Equal(OfferedActions.Order(StringComparer.Ordinal), actions.Order(StringComparer.Ordinal));
        var change = await owner.NextChangeAsync();
        Assert.Equal(1, change.GetProperty("version").GetInt32());
        var others = ApplyView(ownerSync, change)["others"]!.AsObject();
        Assert.Equal("Zero", others[newcomer.UserId]!.GetValue<string>());
    }

    [Fact]
    public async Task Execute_SharedAction_ReachesBothMembersAtTheSameVersion()
    {
        var (owner, member) = await StartSharedGameAsync();
        await using var _ = owner;
        await using var __ = member;
        var ownerSync = await owner.GetStateAsync();
        var memberSync = await member.GetStateAsync();

        var executed = await owner.Connection.InvokeAsync<bool>(nameof(GameHub.Execute), "shared:inc");

        Assert.True(executed);
        var ownerChange = await owner.NextChangeAsync();
        var memberChange = await member.NextChangeAsync();
        Assert.Equal(2, ownerChange.GetProperty("version").GetInt32());
        Assert.Equal(2, memberChange.GetProperty("version").GetInt32());
        Assert.Equal(1, ApplyView(ownerSync, ownerChange)["shared"]!.GetValue<int>());
        Assert.Equal(1, ApplyView(memberSync, memberChange)["shared"]!.GetValue<int>());
    }

    [Fact]
    public async Task Execute_SecretAction_NeverShowsTheValueToTheOtherMember()
    {
        var (owner, member) = await StartSharedGameAsync();
        await using var _ = owner;
        await using var __ = member;
        var before = await member.GetStateAsync();

        await owner.Connection.InvokeAsync<bool>(nameof(GameHub.Execute), "secret:inc");
        await owner.Connection.InvokeAsync<bool>(nameof(GameHub.Execute), "secret:inc");

        var changes = new[] { await member.NextChangeAsync(), await member.NextChangeAsync() };
        var after = await member.GetStateAsync();
        foreach (var held in new[] { before, after })
        {
            AssertOthersHoldOnlySigns(held.GetProperty("view"));
            foreach (var patch in held.GetProperty("actions").EnumerateObject())
                AssertPatchHoldsOnlySigns(patch.Value, owner.UserId);
        }

        foreach (var change in changes)
        {
            AssertPatchHoldsOnlySigns(change.GetProperty("view"), owner.UserId);
            foreach (var patch in change.GetProperty("actions").EnumerateObject())
                AssertPatchHoldsOnlySigns(patch.Value, owner.UserId);
        }

        var view = after.GetProperty("view");
        Assert.Equal(0, view.GetProperty("ownSecret").GetInt32());
        Assert.Equal("Positive", view.GetProperty("others").GetProperty(owner.UserId).GetString());
    }

    [Fact]
    public async Task RemoveMember_WhileConnected_ShrinksTheRemainingViewAndLocksOutTheRemoved()
    {
        var (owner, member) = await StartSharedGameAsync();
        await using var _ = owner;
        await using var __ = member;
        var ownerSync = await owner.GetStateAsync();
        using var client = fixture.CreateClient(owner.Cookies);

        var response = await client.DeleteAsync($"/games/{owner.GameId}/members/{member.UserId}");

        response.EnsureSuccessStatusCode();
        var change = await owner.NextChangeAsync();
        Assert.Equal(2, change.GetProperty("version").GetInt32());
        var others = ApplyView(ownerSync, change)["others"]!.AsObject();
        Assert.False(others.ContainsKey(member.UserId));
        Assert.Equal("NotAMember", await HubTestSupport.WithTimeoutAsync(member.Exited));
        Assert.False(await member.Connection.InvokeAsync<bool>(nameof(GameHub.Execute), "shared:inc"));
    }

    private async Task<GameRun> StartGameAsync()
    {
        var cookies = new CookieContainer();
        using var client = fixture.CreateClient(cookies);
        var userId = await HubTestSupport.LoginAnonymouslyAsync(fixture, client);
        var gameId = await HubTestSupport.CreateGameAsync(client);
        return await GameRun.ConnectAsync(fixture, cookies, gameId, userId);
    }

    private async Task<GameRun> AddUnsyncedMemberAsync(GameRun owner)
    {
        var cookies = new CookieContainer();
        using var client = fixture.CreateClient(cookies);
        var userId = await HubTestSupport.LoginAnonymouslyAsync(fixture, client);
        await HubTestSupport.AddMembershipAsync(fixture, owner.GameId, userId);
        return await GameRun.ConnectAsync(fixture, cookies, owner.GameId, userId);
    }

    private async Task<(GameRun Owner, GameRun Member)> StartSharedGameAsync()
    {
        var owner = await StartGameAsync();
        var member = await AddUnsyncedMemberAsync(owner);
        await member.GetStateAsync();
        await owner.NextChangeAsync();
        await member.NextChangeAsync();
        return (owner, member);
    }

    private sealed class GameRun : IAsyncDisposable
    {
        private readonly AppFixture _fixture;
        private readonly Channel<JsonElement> _changes = Channel.CreateUnbounded<JsonElement>();
        private readonly TaskCompletionSource<string> _exited = new(TaskCreationOptions.RunContinuationsAsynchronously);

        private GameRun(
            AppFixture fixture,
            CookieContainer cookies,
            Guid gameId,
            string userId,
            HubConnection connection
        )
        {
            _fixture = fixture;
            Cookies = cookies;
            GameId = gameId;
            UserId = userId;
            Connection = connection;
            connection.On<JsonElement>(nameof(IGameClient.StateChanged), change => _changes.Writer.TryWrite(change));
            connection.On<string>(nameof(IGameClient.Exit), reason => _exited.TrySetResult(reason));
        }

        public CookieContainer Cookies { get; }

        public Guid GameId { get; }

        public string UserId { get; }

        public HubConnection Connection { get; }

        public Task<string> Exited => _exited.Task;

        public static async Task<GameRun> ConnectAsync(
            AppFixture fixture,
            CookieContainer cookies,
            Guid gameId,
            string userId
        )
        {
            var connection = HubTestSupport.BuildConnection(fixture, cookies, $"gameId={gameId}");
            var run = new GameRun(fixture, cookies, gameId, userId, connection);
            await connection.StartAsync();
            return run;
        }

        public Task<GameRun> ConnectAgainAsync() => ConnectAsync(_fixture, Cookies, GameId, UserId);

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

    private static void AssertOthersHoldOnlySigns(JsonElement view)
    {
        foreach (var other in view.GetProperty("others").EnumerateObject())
            Assert.Equal(JsonValueKind.String, other.Value.ValueKind);
    }

    private static void AssertPatchHoldsOnlySigns(JsonElement patch, string ownerId)
    {
        foreach (var operation in patch.EnumerateArray())
        {
            var path = operation.GetProperty("path").GetString()!;
            if (!path.Contains(ownerId, StringComparison.Ordinal))
                continue;

            if (operation.TryGetProperty("value", out var value))
                Assert.Equal(JsonValueKind.String, value.ValueKind);
        }
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
