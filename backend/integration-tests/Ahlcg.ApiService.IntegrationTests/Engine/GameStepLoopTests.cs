using System.Diagnostics.Metrics;
using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Nodes;
using System.Threading.Channels;
using Ahlcg.ApiService.IntegrationTests.Fixture;
using Ahlcg.Rules.Fixture;
using Json.Patch;
using Microsoft.AspNetCore.SignalR.Client;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using StackExchange.Redis;
using Tablier.Contract;
using Tablier.Engine.History;
using Tablier.Engine.History.Cache;
using Tablier.Engine.History.Cleanup;
using Tablier.Games;
using Tablier.Telemetry;

namespace Ahlcg.ApiService.IntegrationTests.Engine;

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
    private static readonly string?[] RestoredTags = ["b", "a"];

    [Fact]
    public async Task Undo_OwnActionWhileProposalOpen_RestoresAndVoidsProposal()
    {
        var (owner, member) = await StartSharedGameAsync();
        await using var _ = owner;
        await using var __ = member;
        await member.Connection.InvokeAsync<int?>(nameof(GameHub.Execute), "shared:inc");
        Assert.True(await owner.Connection.InvokeAsync<bool>(nameof(GameHub.Undo)));
        var proposal = (await member.Connection.InvokeAsync<JsonElement?>(nameof(GameHub.GetRewindProposal)))!.Value;
        var id = proposal.GetProperty("id").GetGuid();

        Assert.True(await member.Connection.InvokeAsync<bool>(nameof(GameHub.Undo)));

        Assert.Null(await owner.Connection.InvokeAsync<JsonElement?>(nameof(GameHub.GetRewindProposal)));
        Assert.False(await member.Connection.InvokeAsync<bool>(nameof(GameHub.AnswerRewind), id, true));
        Assert.Equal(0, (await owner.GetStateAsync()).GetProperty("view").GetProperty("shared").GetInt32());
        await using var db = fixture.CreateDbContext();
        Assert.Single(
            await db.GameSteps.Where(s => s.GameId == owner.GameId && s.RestoredVersion != null).ToListAsync()
        );
    }

    [Fact]
    public async Task Rewind_CheckpointsAcrossCleanup_RestoresExactStateAndPrivateViews()
    {
        var (owner, member) = await StartSharedGameAsync();
        await using var _ = owner;
        await using var __ = member;
        await using var db = fixture.CreateDbContext();
        await using var redis = await ConnectionMultiplexer.ConnectAsync(fixture.CacheConnectionString);
        await using var services = new ServiceCollection().AddMetrics().BuildServiceProvider();
        var store = new GameHistory<FixtureState>(db, NullLogger<GameHistory<FixtureState>>.Instance);
        var cached = new CachedGameHistory<FixtureState>(
            store,
            redis,
            Options.Create(new GameHistoryCacheOptions()),
            new TablierMetrics(services.GetRequiredService<IMeterFactory>()),
            NullLogger<CachedGameHistory<FixtureState>>.Instance
        );
        var (a, b) = await SeedCheckpointsAsync(owner, member, cached);
        await member.Connection.InvokeAsync<int?>(nameof(GameHub.Execute), "secret:inc");
        await owner.NextChangeAsync();
        await member.NextChangeAsync();
        var ownerBefore = await owner.GetStateAsync();
        var memberBefore = await member.GetStateAsync();
        var targets = (await owner.Connection.InvokeAsync<JsonElement?>(nameof(GameHub.GetRewindTargets)))!.Value;
        Assert.Equal(
            new[] { a.Version, b.Version },
            targets.GetProperty("checkpoints").EnumerateArray().Select(c => c.GetProperty("version").GetInt32()).Order()
        );

        await ApproveCheckpointAsync(owner, member, b.Version);
        await AssertPrivateRestoreAsync(owner, member, ownerBefore, memberBefore);
        Assert.Equal(
            JsonSerializer.Serialize(b.State),
            JsonSerializer.Serialize((await store.LoadCurrent(owner.GameId, CancellationToken.None))!.State)
        );

        await using var cleanupDb = fixture.CreateDbContext();
        await new GameHistoryCleanup(cleanupDb, NullLogger<GameHistoryCleanup>.Instance).Run(CancellationToken.None);
        targets = (await owner.Connection.InvokeAsync<JsonElement?>(nameof(GameHub.GetRewindTargets)))!.Value;
        Assert.Equal(
            a.Version,
            targets.GetProperty("checkpoints").EnumerateArray().Single().GetProperty("version").GetInt32()
        );
        await ApproveCheckpointAsync(owner, member, a.Version);
        Assert.Equal(
            JsonSerializer.Serialize(a.State),
            JsonSerializer.Serialize((await store.LoadCurrent(owner.GameId, CancellationToken.None))!.State)
        );
        Assert.Equal(
            JsonSerializer.Serialize(a.State),
            JsonSerializer.Serialize((await store.LoadAt(owner.GameId, a.Version, CancellationToken.None))!.State)
        );
        await AssertRestoresAsync(owner.GameId, a.Version, b.Version);
        Assert.NotNull(await owner.Connection.InvokeAsync<int?>(nameof(GameHub.Execute), "shared:inc"));
        Assert.Equal(11, (await owner.GetStateAsync()).GetProperty("view").GetProperty("shared").GetInt32());
        Assert.Equal(
            JsonSerializer.Serialize(a.State with { Shared = 11 }),
            JsonSerializer.Serialize((await store.LoadCurrent(owner.GameId, CancellationToken.None))!.State)
        );
    }

    [Fact]
    public async Task Undo_MembershipSync_InvalidatesOpenProposal()
    {
        var (owner, member) = await StartSharedGameAsync();
        await using var _ = owner;
        await using var __ = member;
        await member.Connection.InvokeAsync<int?>(nameof(GameHub.Execute), "shared:inc");
        Assert.True(await owner.Connection.InvokeAsync<bool>(nameof(GameHub.Undo)));
        var id = (await member.Connection.InvokeAsync<JsonElement?>(nameof(GameHub.GetRewindProposal)))!
            .Value.GetProperty("id")
            .GetGuid();
        await using var newcomer = await AddUnsyncedMemberAsync(owner);
        await newcomer.GetStateAsync();
        Assert.Null(await owner.Connection.InvokeAsync<JsonElement?>(nameof(GameHub.GetRewindProposal)));
        Assert.False(await member.Connection.InvokeAsync<bool>(nameof(GameHub.AnswerRewind), id, true));
    }

    [Fact]
    public async Task Undo_RevealActionAndAutomaticAdvance_InvalidatesOpenProposal()
    {
        var (owner, member) = await StartSharedGameAsync();
        await using var _ = owner;
        await using var __ = member;
        await member.Connection.InvokeAsync<int?>(nameof(GameHub.Execute), "shared:inc");
        Assert.True(await owner.Connection.InvokeAsync<bool>(nameof(GameHub.Undo)));
        var id = (await member.Connection.InvokeAsync<JsonElement?>(nameof(GameHub.GetRewindProposal)))!
            .Value.GetProperty("id")
            .GetGuid();
        Assert.NotNull(await owner.Connection.InvokeAsync<int?>(nameof(GameHub.Execute), "reveal"));
        Assert.Null(await owner.Connection.InvokeAsync<JsonElement?>(nameof(GameHub.GetRewindProposal)));
        Assert.False(await member.Connection.InvokeAsync<bool>(nameof(GameHub.AnswerRewind), id, true));
        var view = (await owner.GetStateAsync()).GetProperty("view");
        Assert.Equal(JsonValueKind.Number, view.GetProperty("revealed").ValueKind);
    }

    [Fact]
    public async Task Undo_ActionAndApprovalRace_NeverRestoresOverAnAction()
    {
        var (owner, member) = await StartSharedGameAsync();
        await using var _ = owner;
        await using var __ = member;
        await member.Connection.InvokeAsync<int?>(nameof(GameHub.Execute), "shared:inc");
        Assert.True(await owner.Connection.InvokeAsync<bool>(nameof(GameHub.Undo)));
        var proposal = (await member.Connection.InvokeAsync<JsonElement?>(nameof(GameHub.GetRewindProposal)))!.Value;
        var id = proposal.GetProperty("id").GetGuid();
        var action = owner.Connection.InvokeAsync<int?>(nameof(GameHub.Execute), "shared:inc");
        var answer = member.Connection.InvokeAsync<bool>(nameof(GameHub.AnswerRewind), id, true);
        await Task.WhenAll(action, answer);

        await using var db = fixture.CreateDbContext();
        var steps = await db.GameSteps.Where(s => s.GameId == owner.GameId).OrderBy(s => s.Version).ToListAsync();
        var restored = steps.SingleOrDefault(s => s.RestoredVersion is not null);
        if (restored is not null)
            Assert.True(restored.Version < await action);
        else
            Assert.False(await answer);
    }

    [Fact]
    public async Task Rewind_RemovedMemberOnExistingConnection_CannotReadRequestOrVote()
    {
        var (owner, member) = await StartSharedGameAsync();
        await using var _ = owner;
        await using var __ = member;
        await member.Connection.InvokeAsync<int?>(nameof(GameHub.Execute), "shared:inc");
        Assert.True(await owner.Connection.InvokeAsync<bool>(nameof(GameHub.Undo)));
        var proposal = (await owner.Connection.InvokeAsync<JsonElement?>(nameof(GameHub.GetRewindProposal)))!.Value;
        var id = proposal.GetProperty("id").GetGuid();
        await using (var db = fixture.CreateDbContext())
        {
            var row = await db.GameMembers.SingleAsync(m => m.GameId == owner.GameId && m.UserId == member.UserId);
            db.GameMembers.Remove(row);
            await db.SaveChangesAsync();
        }

        Assert.Null(await member.Connection.InvokeAsync<JsonElement?>(nameof(GameHub.GetRewindTargets)));
        Assert.Null(await member.Connection.InvokeAsync<JsonElement?>(nameof(GameHub.GetRewindProposal)));
        Assert.False(await member.Connection.InvokeAsync<bool>(nameof(GameHub.Undo)));
        Assert.False(await member.Connection.InvokeAsync<bool>(nameof(GameHub.RequestRewind), 0));
        Assert.False(await member.Connection.InvokeAsync<bool>(nameof(GameHub.AnswerRewind), id, true));
    }

    [Fact]
    public async Task Rewind_ConcurrentApprovals_RestoresOnce()
    {
        var (owner, first) = await StartSharedGameAsync();
        await using var _ = owner;
        await using var __ = first;
        await using var second = await AddUnsyncedMemberAsync(owner);
        await second.GetStateAsync();
        await owner.NextChangeAsync();
        await owner.Connection.InvokeAsync<int?>(nameof(GameHub.Execute), "reveal");
        await first.Connection.InvokeAsync<int?>(nameof(GameHub.Execute), "shared:inc");
        await second.Connection.InvokeAsync<int?>(nameof(GameHub.Execute), "shared:inc");
        var targets = (await owner.Connection.InvokeAsync<JsonElement?>(nameof(GameHub.GetRewindTargets)))!.Value;
        var checkpoint = targets.GetProperty("checkpoints").EnumerateArray().Single().GetProperty("version").GetInt32();
        Assert.True(await owner.Connection.InvokeAsync<bool>(nameof(GameHub.RequestRewind), checkpoint));
        var proposal = (await first.Connection.InvokeAsync<JsonElement?>(nameof(GameHub.GetRewindProposal)))!.Value;
        var id = proposal.GetProperty("id").GetGuid();
        Assert.True(await first.Connection.InvokeAsync<bool>(nameof(GameHub.AnswerRewind), id, true));
        Assert.True(await first.Connection.InvokeAsync<bool>(nameof(GameHub.AnswerRewind), id, true));
        Assert.True(await first.Connection.InvokeAsync<bool>(nameof(GameHub.AnswerRewind), id, false));
        Assert.Null(await second.Connection.InvokeAsync<JsonElement?>(nameof(GameHub.GetRewindProposal)));
        Assert.True(await owner.Connection.InvokeAsync<bool>(nameof(GameHub.RequestRewind), checkpoint));
        proposal = (await first.Connection.InvokeAsync<JsonElement?>(nameof(GameHub.GetRewindProposal)))!.Value;
        id = proposal.GetProperty("id").GetGuid();

        var answers = await Task.WhenAll(
            first.Connection.InvokeAsync<bool>(nameof(GameHub.AnswerRewind), id, true),
            second.Connection.InvokeAsync<bool>(nameof(GameHub.AnswerRewind), id, true)
        );

        Assert.All(answers, Assert.True);
        await using var db = fixture.CreateDbContext();
        Assert.Equal(
            1,
            await db.GameSteps.CountAsync(s => s.GameId == owner.GameId && s.RestoredVersion == checkpoint)
        );
        Assert.Equal(0, (await owner.GetStateAsync()).GetProperty("view").GetProperty("shared").GetInt32());
    }

    [Fact]
    public async Task Undo_OwnActions_RestoresRepeatedly()
    {
        await using var game = await StartGameAsync();
        await game.Connection.InvokeAsync<int?>(nameof(GameHub.Execute), "shared:inc");
        await game.Connection.InvokeAsync<int?>(nameof(GameHub.Execute), "shared:inc");

        Assert.True(await game.Connection.InvokeAsync<bool>(nameof(GameHub.Undo)));
        Assert.Equal(1, (await game.GetStateAsync()).GetProperty("view").GetProperty("shared").GetInt32());
        Assert.True(await game.Connection.InvokeAsync<bool>(nameof(GameHub.Undo)));
        Assert.Equal(0, (await game.GetStateAsync()).GetProperty("view").GetProperty("shared").GetInt32());
        Assert.False(await game.Connection.InvokeAsync<bool>(nameof(GameHub.Undo)));
        await using var db = fixture.CreateDbContext();
        var restores = await db
            .GameSteps.Where(s => s.GameId == game.GameId && s.RestoredVersion != null)
            .OrderBy(s => s.Version)
            .ToListAsync();
        Assert.Equal([1, 0], restores.Select(s => s.RestoredVersion));
    }

    [Fact]
    public async Task Undo_OtherMembersAction_RequiresConsentAndRestores()
    {
        var (owner, member) = await StartSharedGameAsync();
        await using var _ = owner;
        await using var __ = member;
        await member.Connection.InvokeAsync<int?>(nameof(GameHub.Execute), "secret:inc");

        Assert.True(await owner.Connection.InvokeAsync<bool>(nameof(GameHub.Undo)));
        var proposal = await member.Connection.InvokeAsync<JsonElement?>(nameof(GameHub.GetRewindProposal));
        Assert.NotNull(proposal);
        await using var reconnected = await member.ConnectAgainAsync();
        var recovered = await reconnected.Connection.InvokeAsync<JsonElement?>(nameof(GameHub.GetRewindProposal));
        Assert.Equal(proposal.Value.GetProperty("id").GetGuid(), recovered!.Value.GetProperty("id").GetGuid());
        var id = proposal.Value.GetProperty("id").GetGuid();
        Assert.False(await owner.Connection.InvokeAsync<bool>(nameof(GameHub.AnswerRewind), id, true));
        Assert.True(await member.Connection.InvokeAsync<bool>(nameof(GameHub.AnswerRewind), id, true));
        Assert.Null(await owner.Connection.InvokeAsync<JsonElement?>(nameof(GameHub.GetRewindProposal)));
        Assert.Equal(0, (await member.GetStateAsync()).GetProperty("view").GetProperty("ownSecret").GetInt32());
        Assert.False(await member.Connection.InvokeAsync<bool>(nameof(GameHub.AnswerRewind), id, true));
    }

    [Fact]
    public async Task Undo_ProposalRejectOrAction_ClosesWithoutRestore()
    {
        var (owner, member) = await StartSharedGameAsync();
        await using var _ = owner;
        await using var __ = member;
        await member.Connection.InvokeAsync<int?>(nameof(GameHub.Execute), "shared:inc");
        Assert.True(await owner.Connection.InvokeAsync<bool>(nameof(GameHub.Undo)));
        var first = (await owner.Connection.InvokeAsync<JsonElement?>(nameof(GameHub.GetRewindProposal)))!
            .Value.GetProperty("id")
            .GetGuid();
        Assert.True(await member.Connection.InvokeAsync<bool>(nameof(GameHub.AnswerRewind), first, false));
        Assert.True(await owner.Connection.InvokeAsync<bool>(nameof(GameHub.Undo)));
        var second = (await owner.Connection.InvokeAsync<JsonElement?>(nameof(GameHub.GetRewindProposal)))!
            .Value.GetProperty("id")
            .GetGuid();
        Assert.NotEqual(first, second);
        Assert.NotNull(await owner.Connection.InvokeAsync<int?>(nameof(GameHub.Execute), "shared:inc"));
        Assert.Null(await member.Connection.InvokeAsync<JsonElement?>(nameof(GameHub.GetRewindProposal)));
        Assert.False(await member.Connection.InvokeAsync<bool>(nameof(GameHub.AnswerRewind), second, true));
        Assert.Equal(2, (await owner.GetStateAsync()).GetProperty("view").GetProperty("shared").GetInt32());
    }

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

        var executed = await game.Connection.InvokeAsync<int?>(nameof(GameHub.Execute), "shared:inc");

        var change = await game.NextChangeAsync();
        Assert.Equal(change.GetProperty("version").GetInt32(), executed);
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

        await game.Connection.InvokeAsync<int?>(nameof(GameHub.Execute), action);

        var firstChange = await game.NextChangeAsync();
        var actual =
            action == "reveal"
                ? ApplyView(sync, firstChange)
                : JsonNode.Parse((await game.GetStateAsync()).GetProperty("view").GetRawText())!;
        Assert.True(JsonNode.DeepEquals(promised, actual));
    }

    [Fact]
    public async Task Execute_ActionNotOffered_ReturnsNullAndChangesNothing()
    {
        await using var game = await StartGameAsync();

        var executed = await game.Connection.InvokeAsync<int?>(nameof(GameHub.Execute), "nope");

        Assert.Null(executed);
        Assert.False(await game.HasChangeWithinAsync(TimeSpan.FromMilliseconds(500)));
        await using var db = fixture.CreateDbContext();
        Assert.False(await db.GameSteps.AnyAsync(s => s.GameId == game.GameId));
    }

    [Fact]
    public async Task Execute_Reveal_SendsThePendingVersionThenTheAdvancedOne()
    {
        await using var game = await StartGameAsync();
        var sync = await game.GetStateAsync();

        var executed = await game.Connection.InvokeAsync<int?>(nameof(GameHub.Execute), "reveal");

        Assert.Equal(1, executed);
        var pending = await game.NextChangeAsync();
        var advanced = await game.NextChangeAsync();
        Assert.Equal(1, pending.GetProperty("version").GetInt32());
        Assert.Empty(pending.GetProperty("actions").EnumerateObject());
        Assert.Equal(2, advanced.GetProperty("version").GetInt32());
        Assert.Empty(ApplyView(sync, pending)["actingPlayers"]!.AsArray());
        var advancedView = ApplyView(sync, pending, advanced);
        Assert.Equal([game.UserId], advancedView["actingPlayers"]!.AsArray().Select(p => p!.GetValue<string>()));
        var revealed = advancedView["revealed"]!.GetValue<int>();
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
            first.Connection.InvokeAsync<int?>(nameof(GameHub.Execute), "shared:inc"),
            second.Connection.InvokeAsync<int?>(nameof(GameHub.Execute), "shared:inc")
        );

        Assert.Equal([1, 2], results.Order());
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
        await game.Connection.InvokeAsync<int?>(nameof(GameHub.Execute), "reveal");
        await game.Connection.InvokeAsync<int?>(nameof(GameHub.Execute), "shared:inc");

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
        Assert.Equal(nameof(SecretSign.Zero), others[newcomer.UserId]!.GetValue<string>());
        Assert.False(await newcomer.HasChangeWithinAsync(TimeSpan.FromMilliseconds(500)));
    }

    [Fact]
    public async Task Execute_SharedAction_ReachesBothMembersAtTheSameVersion()
    {
        var (owner, member) = await StartSharedGameAsync();
        await using var _ = owner;
        await using var __ = member;
        var ownerSync = await owner.GetStateAsync();
        var memberSync = await member.GetStateAsync();

        var executed = await owner.Connection.InvokeAsync<int?>(nameof(GameHub.Execute), "shared:inc");

        Assert.Equal(2, executed);
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

        await owner.Connection.InvokeAsync<int?>(nameof(GameHub.Execute), "secret:inc");
        await owner.Connection.InvokeAsync<int?>(nameof(GameHub.Execute), "secret:inc");

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
            AssertPatchHoldsOnlySigns(change.GetProperty("viewPatch"), owner.UserId);
            foreach (var patch in change.GetProperty("actions").EnumerateObject())
                AssertPatchHoldsOnlySigns(patch.Value, owner.UserId);
        }

        var view = after.GetProperty("view");
        Assert.Equal(0, view.GetProperty("ownSecret").GetInt32());
        Assert.Equal(nameof(SecretSign.Positive), view.GetProperty("others").GetProperty(owner.UserId).GetString());
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
        Assert.Null(await member.Connection.InvokeAsync<int?>(nameof(GameHub.Execute), "shared:inc"));
    }

    [Fact]
    public async Task GetState_SharedGame_ListsEveryMemberActingOrderedForBoth()
    {
        var (owner, member) = await StartSharedGameAsync();
        await using var _ = owner;
        await using var __ = member;

        var ownerSync = await owner.GetStateAsync();
        var memberSync = await member.GetStateAsync();

        string[] expected = [.. new[] { owner.UserId, member.UserId }.Order(StringComparer.Ordinal)];
        foreach (var sync in new[] { ownerSync, memberSync })
        {
            var acting = sync.GetProperty("view").GetProperty("actingPlayers").EnumerateArray();
            Assert.Equal(expected, acting.Select(p => p.GetString()));
        }
    }

    [Fact]
    public async Task InviteCode_JoinFillsTheTable_OwnerAndJoinerBothReceiveNoCode()
    {
        var ownerCookies = new CookieContainer();
        using var owner = fixture.CreateClient(ownerCookies);
        await HubTestSupport.LoginAnonymouslyAsync(fixture, owner);
        var gameId = await HubTestSupport.CreateGameAsync(owner);
        var membersCount = await owner.PutAsJsonAsync(
            $"/games/{gameId}/membersCount",
            new GameEndpoints.SetMembersCountRequest(2)
        );
        membersCount.EnsureSuccessStatusCode();
        var ownerCodes = Channel.CreateUnbounded<string?>();
        await using var ownerConnection = HubTestSupport.BuildConnection(fixture, ownerCookies, $"gameId={gameId}");
        ownerConnection.On<string?>(nameof(IGameClient.InviteCodeChanged), code => ownerCodes.Writer.TryWrite(code));
        await ownerConnection.StartAsync();
        var code = await HubTestSupport.WithTimeoutAsync(ownerCodes.Reader.ReadAsync().AsTask());
        Assert.NotNull(code);
        Assert.Equal(6, code.Length);

        var joinerCookies = new CookieContainer();
        using var joiner = fixture.CreateClient(joinerCookies);
        await HubTestSupport.LoginAnonymouslyAsync(fixture, joiner);
        var join = await joiner.PostAsJsonAsync("/games/join", new GameEndpoints.JoinGameRequest(code));
        join.EnsureSuccessStatusCode();

        var closed = await HubTestSupport.WithTimeoutAsync(ownerCodes.Reader.ReadAsync().AsTask());
        Assert.Null(closed);
        var joinerCodes = Channel.CreateUnbounded<string?>();
        await using var joinerConnection = HubTestSupport.BuildConnection(fixture, joinerCookies, $"gameId={gameId}");
        joinerConnection.On<string?>(nameof(IGameClient.InviteCodeChanged), c => joinerCodes.Writer.TryWrite(c));
        await joinerConnection.StartAsync();
        Assert.Null(await HubTestSupport.WithTimeoutAsync(joinerCodes.Reader.ReadAsync().AsTask()));
    }

    private static async Task<(StoredState<FixtureState> A, StoredState<FixtureState> B)> SeedCheckpointsAsync(
        GameRun owner,
        GameRun member,
        CachedGameHistory<FixtureState> cached
    )
    {
        var initial = (await cached.LoadCurrent(owner.GameId, CancellationToken.None))!;
        var stateA = initial.State with
        {
            Shared = 10,
            Secrets = initial.State.Secrets.SetItem(owner.UserId, 1).SetItem(member.UserId, -1),
            Journal = initial.State.Journal.Add(new FixtureJournalEntry("first", new Dictionary<string, object?>())),
            Random = initial.State.Random.Next(1, 7).Random,
        };
        var a = (
            await cached.Append(
                owner.GameId,
                initial,
                new StepResult<FixtureState>(stateA, "a"),
                new PlayerChoice(owner.UserId, "seed-a"),
                CancellationToken.None
            )
        )!;
        var stateB = stateA with
        {
            Shared = 20,
            Secrets = stateA.Secrets.SetItem(owner.UserId, 2).SetItem(member.UserId, -2),
            Journal = stateA.Journal.Add(new FixtureJournalEntry("second", new Dictionary<string, object?>())),
            Random = stateA.Random.Next(1, 7).Random,
        };
        var b = (
            await cached.Append(
                owner.GameId,
                a,
                new StepResult<FixtureState>(stateB, "b"),
                new PlayerChoice(member.UserId, "seed-b"),
                CancellationToken.None
            )
        )!;
        return (a, b);
    }

    private async Task AssertRestoresAsync(Guid gameId, int a, int b)
    {
        await using var db = fixture.CreateDbContext();
        var restores = await db
            .GameSteps.AsNoTracking()
            .Where(s => s.GameId == gameId && s.RestoredVersion != null)
            .OrderBy(s => s.Version)
            .ToListAsync();
        Assert.Equal(new int?[] { b, a }, restores.Select(s => s.RestoredVersion));
        Assert.Equal(RestoredTags, restores.Select(s => s.Checkpoint));
        Assert.All(restores, s => Assert.False(s.IsIrreversible));
    }

    private static async Task ApproveCheckpointAsync(GameRun owner, GameRun member, int version)
    {
        Assert.True(await owner.Connection.InvokeAsync<bool>(nameof(GameHub.RequestRewind), version));
        var proposal = (await member.Connection.InvokeAsync<JsonElement?>(nameof(GameHub.GetRewindProposal)))!.Value;
        Assert.True(
            await member.Connection.InvokeAsync<bool>(
                nameof(GameHub.AnswerRewind),
                proposal.GetProperty("id").GetGuid(),
                true
            )
        );
    }

    private static async Task AssertPrivateRestoreAsync(
        GameRun owner,
        GameRun member,
        JsonElement ownerBefore,
        JsonElement memberBefore
    )
    {
        var ownerChange = await owner.NextChangeAsync();
        var memberChange = await member.NextChangeAsync();
        var ownerView = ApplyView(ownerBefore, ownerChange);
        var memberView = ApplyView(memberBefore, memberChange);
        Assert.Equal(2, ownerView["ownSecret"]!.GetValue<int>());
        Assert.Equal(-2, memberView["ownSecret"]!.GetValue<int>());
        Assert.Equal(nameof(SecretSign.Negative), ownerView["others"]![member.UserId]!.GetValue<string>());
        Assert.Equal(nameof(SecretSign.Positive), memberView["others"]![owner.UserId]!.GetValue<string>());
        AssertPatchHoldsOnlySigns(ownerChange.GetProperty("viewPatch"), member.UserId);
        AssertPatchHoldsOnlySigns(memberChange.GetProperty("viewPatch"), owner.UserId);
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
