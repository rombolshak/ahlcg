using System.Diagnostics.Metrics;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Logging.Testing;
using Microsoft.Extensions.Options;
using Moq;
using Tablier.Contract;
using Tablier.Data;
using Tablier.Engine;
using Tablier.Engine.Execution;
using Tablier.Engine.History;
using Tablier.Games;
using Tablier.Games.Sessions;

namespace Tablier.Tests.Engine.Execution;

public class GameEngineTests
{
    private const string Member = "alice";
    private const string Increment = "inc";
    private const string Close = "close";
    private const string Leaver = "bob";

    private static readonly Guid GameId = Guid.NewGuid();

    private static readonly IReadOnlySet<string> Alone = new HashSet<string>(StringComparer.Ordinal) { Member };

    private static readonly IReadOnlySet<string> Pair = new HashSet<string>(StringComparer.Ordinal) { Member, Leaver };

    private static readonly TestState Open = new(Counter: 0, IsOpen: true, Members: Alone);
    private static readonly TestState Closed = new(Counter: 0, IsOpen: false, Members: Alone);
    private static readonly TestState OpenPair = new(Counter: 0, IsOpen: true, Members: Pair);

    [Fact]
    public async Task Execute_MissingHistory_ThrowsWithoutAppending()
    {
        var run = CreateRun(loads: [Open], appends: []);
        run.History.Setup(h => h.LoadCurrent(GameId, It.IsAny<CancellationToken>()))
            .ReturnsAsync((StoredState<TestState>?)null);

        await Assert.ThrowsAsync<InvalidOperationException>(() => run.Engine.Execute(GameId, Member, Increment));

        run.Client.Verify(c => c.StateChanged(It.IsAny<StateChange>()), Times.Never);
    }

    [Fact]
    public async Task SyncMembers_MissingHistory_Throws()
    {
        var run = CreateRun(loads: [Open], appends: []);
        run.History.Setup(h => h.LoadCurrent(GameId, It.IsAny<CancellationToken>()))
            .ReturnsAsync((StoredState<TestState>?)null);

        await Assert.ThrowsAsync<InvalidOperationException>(() => run.Engine.SyncMembers(GameId));
    }

    [Fact]
    public async Task GetMemberState_MissingHistory_Throws()
    {
        var run = CreateRun(loads: [Open], appends: []);
        run.History.Setup(h => h.LoadCurrent(GameId, It.IsAny<CancellationToken>()))
            .ReturnsAsync((StoredState<TestState>?)null);

        await Assert.ThrowsAsync<InvalidOperationException>(() => run.Engine.GetMemberState(GameId, Member));
    }

    [Fact]
    public async Task Execute_AppendRefusedOnce_RetriesAndSendsStateChangedOnce()
    {
        // given
        var run = CreateRun(loads: [Open], appends: [false, true]);

        // when
        var executed = await run.Engine.Execute(GameId, Member, Increment, CancellationToken.None);

        // then
        Assert.Equal(1, executed);
        run.Client.Verify(c => c.StateChanged(It.IsAny<StateChange>()), Times.Once);
    }

    [Fact]
    public async Task Execute_AppendRefusedOnEveryAttempt_ReturnsNullAndSendsNothing()
    {
        // given
        var run = CreateRun(loads: [Open], appends: [false, false, false]);

        // when
        var executed = await run.Engine.Execute(GameId, Member, Increment, CancellationToken.None);

        // then
        Assert.Null(executed);
        run.Client.Verify(c => c.StateChanged(It.IsAny<StateChange>()), Times.Never);
    }

    [Fact]
    public async Task Execute_StateDoesNotOfferAction_ReturnsNullWithoutAppending()
    {
        // given
        var run = CreateRun(loads: [Closed], appends: []);

        // when
        var executed = await run.Engine.Execute(GameId, Member, Increment, CancellationToken.None);

        // then
        Assert.Null(executed);
        run.History.Verify(
            h =>
                h.Append(
                    It.IsAny<Guid>(),
                    It.IsAny<StoredState<TestState>>(),
                    It.IsAny<StepResult<TestState>>(),
                    It.IsAny<PlayerChoice?>(),
                    It.IsAny<CancellationToken>()
                ),
            Times.Never
        );
    }

    [Fact]
    public async Task Execute_AdvanceAppendRefused_StillReturnsTheVersionAndSendsOnlyThePlayerStep()
    {
        // given
        var run = CreateRun(loads: [Open], appends: [true, false]);

        // when
        var executed = await run.Engine.Execute(GameId, Member, Close, CancellationToken.None);

        // then
        Assert.Equal(1, executed);
        run.Client.Verify(c => c.StateChanged(It.IsAny<StateChange>()), Times.Once);
    }

    [Fact]
    public async Task Execute_NonPlayerStepFollows_ReturnsThePlayerStepVersionNotTheAdvancedOne()
    {
        // given
        var run = CreateRun(loads: [Open], appends: [true, true]);

        // when
        var executed = await run.Engine.Execute(GameId, Member, Close, CancellationToken.None);

        // then
        Assert.Equal(1, executed);
        run.Client.Verify(c => c.StateChanged(It.IsAny<StateChange>()), Times.Exactly(2));
    }

    [Fact]
    public async Task SyncMembers_AppendRefusedOnce_CommitsOneMembershipStep()
    {
        // given
        var run = CreateRun(loads: [OpenPair, OpenPair, Open], appends: [false, true]);
        await run.AddMemberRowAsync(Member);

        // when
        await run.Engine.SyncMembers(GameId, CancellationToken.None);

        // then
        run.History.Verify(
            h =>
                h.Append(
                    GameId,
                    It.IsAny<StoredState<TestState>>(),
                    It.IsAny<StepResult<TestState>>(),
                    choice: null,
                    It.IsAny<CancellationToken>()
                ),
            Times.Exactly(2)
        );
        run.Client.Verify(c => c.StateChanged(It.IsAny<StateChange>()), Times.Once);
    }

    [Fact]
    public async Task Execute_CancelledWaiter_DoesNotReleaseAnotherOperationGate()
    {
        var firstRun = CreateRun(loads: [Open], appends: [true]);
        var secondRun = CreateRun(loads: [Open], appends: [true]);
        var entered = new TaskCompletionSource(TaskCreationOptions.RunContinuationsAsynchronously);
        var release = new TaskCompletionSource(TaskCreationOptions.RunContinuationsAsynchronously);
        firstRun
            .History.Setup(h => h.LoadCurrent(GameId, It.IsAny<CancellationToken>()))
            .Returns(async () =>
            {
                entered.SetResult();
                await release.Task;
                return new StoredState<TestState>(0, Open);
            });
        var first = firstRun.Engine.Execute(GameId, Member, Increment);
        await entered.Task;
        using var cancellation = new CancellationTokenSource();
        await cancellation.CancelAsync();

        await Assert.ThrowsAnyAsync<OperationCanceledException>(() =>
            secondRun.Engine.Execute(GameId, Member, Increment, cancellation.Token)
        );

        secondRun.History.Verify(h => h.LoadCurrent(GameId, It.IsAny<CancellationToken>()), Times.Never);
        release.SetResult();
        await first;
        Assert.Equal(1, await secondRun.Engine.Execute(GameId, Member, Increment));
    }

    [Theory]
    [InlineData(false)]
    [InlineData(true)]
    public async Task Join_InviteEndedOrReplaced_ReturnsUnusableInvite(bool replaced)
    {
        var run = CreateRun(loads: [Open], appends: []);
        run.Sessions.Join(GameId, Member, "connection", DateTimeOffset.UnixEpoch);
        var code = run.Sessions.SyncInviteCode(GameId, memberCount: 1, intendedPlayersCount: 2)!.InviteCode!;
        if (replaced)
            run.Sessions.RotateInviteCode(GameId, memberCount: 1, intendedPlayersCount: 2);
        else
            run.Sessions.Leave(GameId, Member, "connection", DateTimeOffset.UnixEpoch);

        var result = await run.Engine.Join(Leaver, code);

        Assert.IsType<JoinGameResult.UnusableInvite>(result);
        Assert.Empty(run.Db.GameMembers);
    }

    [Theory]
    [InlineData(null, true)]
    [InlineData("5", false)]
    public async Task Create_InvalidConfiguration_ReturnsReasonWithoutWriting(string? json, bool missing)
    {
        var run = CreateRun(loads: [Open], appends: []);
        var configuration = json is null ? default : System.Text.Json.JsonDocument.Parse(json).RootElement.Clone();

        var result = await run.Engine.Create(Member, "key", configuration);

        Assert.Equal(new CreateGameResult.InvalidConfiguration(IsMissing: missing), result);
        Assert.Empty(run.Db.Games);
    }

    [Fact]
    public async Task Create_ValidConfiguration_PersistsOwnerAndBeginsHistory()
    {
        var run = CreateRun(loads: [Open], appends: []);
        var configuration = System.Text.Json.JsonDocument.Parse("{}").RootElement.Clone();

        var result = await run.Engine.Create(Member, "key", configuration);

        var game = Assert.IsType<CreateGameResult.Created>(result).Game;
        Assert.Equal(Member, game.OwnerId);
        Assert.Equal("key", game.IdempotencyKey);
        Assert.Equal(1, game.IntendedPlayersCount);
        Assert.Equal(Member, Assert.Single(run.Db.GameMembers).UserId);
        run.History.Verify(h => h.Begin(game.Id, Open, It.IsAny<CancellationToken>()), Times.Once);
    }

    [Theory]
    [InlineData(1, false, true)]
    [InlineData(2, true, false)]
    [InlineData(2, false, false)]
    public async Task Join_LiveInvite_RespectsCapacityAndExistingMembership(int capacity, bool existing, bool full)
    {
        var run = CreateRun(loads: [Open], appends: [true]);
        var game = new Game
        {
            Id = GameId,
            OwnerId = Member,
            IdempotencyKey = "key",
            Configuration = System.Text.Json.JsonDocument.Parse("{}"),
            CreatedAt = DateTimeOffset.UnixEpoch,
            LastPlayedAt = DateTimeOffset.UnixEpoch,
            IntendedPlayersCount = capacity,
        };
        run.Db.Games.Add(game);
        await run.AddMemberRowAsync(Member);
        if (existing)
            await run.AddMemberRowAsync(Leaver);
        run.Sessions.Join(GameId, Member, "connection", DateTimeOffset.UnixEpoch);
        run.Sessions.SyncInviteCode(GameId, memberCount: 0, intendedPlayersCount: 2);
        var code = run.Sessions.Find(GameId)!.InviteCode!;

        var result = await run.Engine.Join(Leaver, code.ToLowerInvariant());

        if (full)
            Assert.IsType<JoinGameResult.GameFull>(result);
        else
            Assert.Equal(GameId, Assert.IsType<JoinGameResult.Joined>(result).Membership.GameId);
        run.History.Verify(
            h =>
                h.Append(
                    GameId,
                    It.IsAny<StoredState<TestState>>(),
                    It.Is<StepResult<TestState>>(step => step.IsIrreversible),
                    choice: null,
                    It.IsAny<CancellationToken>()
                ),
            existing || full ? Times.Never() : Times.Once()
        );
    }

    [Theory]
    [InlineData("")]
    [InlineData("UNKNOWN")]
    public async Task Join_UnknownInvite_ReturnsUnusableInvite(string code)
    {
        var run = CreateRun(loads: [Open], appends: []);

        var result = await run.Engine.Join(Leaver, code);

        Assert.IsType<JoinGameResult.UnusableInvite>(result);
        Assert.Empty(run.Db.GameMembers);
    }

    [Theory]
    [InlineData(false, "LogJoinRefusedUnknownCode")]
    [InlineData(true, "LogJoinRefusedGameMissing")]
    public async Task Join_UnusableInvite_LogsTheDistinctRefusal(bool missingGame, string eventName)
    {
        var logger = new FakeLogger<GameEngine<TestConfiguration, TestState, TestView>>();
        var run = CreateRun(loads: [Open], appends: [], logger);
        var code = "UNKNOWN";
        if (missingGame)
        {
            run.Sessions.Join(GameId, Member, "connection", DateTimeOffset.UnixEpoch);
            code = run.Sessions.SyncInviteCode(GameId, memberCount: 1, intendedPlayersCount: 2)!.InviteCode!;
        }

        var result = await run.Engine.Join(Leaver, code);

        Assert.IsType<JoinGameResult.UnusableInvite>(result);
        Assert.Equal(eventName, logger.LatestRecord.Id.Name);
    }

    private static Run CreateRun(
        TestState[] loads,
        bool[] appends,
        ILogger<GameEngine<TestConfiguration, TestState, TestView>>? logger = null
    )
    {
        var history = new Mock<IGameHistory<TestState>>();
        var reads = 0;
        history
            .Setup(h => h.LoadCurrent(GameId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(() => new StoredState<TestState>(0, loads[Math.Min(reads++, loads.Length - 1)]));

        var outcomes = new Queue<bool>(appends);
        history
            .Setup(h =>
                h.Append(
                    GameId,
                    It.IsAny<StoredState<TestState>>(),
                    It.IsAny<StepResult<TestState>>(),
                    It.IsAny<PlayerChoice?>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .ReturnsAsync(
                (
                    Guid _,
                    StoredState<TestState> previous,
                    StepResult<TestState> result,
                    PlayerChoice? _,
                    CancellationToken _
                ) => outcomes.Dequeue() ? new StoredState<TestState>(previous.Version + 1, result.State) : null
            );

        var client = new Mock<IGameClient>();
        var clients = new Mock<IHubClients<IGameClient>>();
        clients.Setup(c => c.Group(It.IsAny<string>())).Returns(client.Object);
        var hub = new Mock<IHubContext<GameHub, IGameClient>>();
        hub.Setup(h => h.Clients).Returns(clients.Object);

        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .ConfigureWarnings(w => w.Ignore(InMemoryEventId.TransactionIgnoredWarning))
            .Options;
        var db = new ApplicationDbContext(options);

        var rules = new TestRules();
        var sessions = new GameSessions(
            new ServiceCollection().AddMetrics().BuildServiceProvider().GetRequiredService<IMeterFactory>(),
            NullLogger<GameSessions>.Instance
        );
        var engine = new GameEngine<TestConfiguration, TestState, TestView>(
            new GameRules<TestConfiguration, TestState, TestView>(rules, rules, rules),
            history.Object,
            db,
            hub.Object,
            Options.Create(new JsonHubProtocolOptions()),
            sessions,
            TimeProvider.System,
            logger ?? NullLogger<GameEngine<TestConfiguration, TestState, TestView>>.Instance
        );
        return new Run(engine, history, client, db, sessions);
    }

    private sealed record Run(
        GameEngine<TestConfiguration, TestState, TestView> Engine,
        Mock<IGameHistory<TestState>> History,
        Mock<IGameClient> Client,
        ApplicationDbContext Db,
        GameSessions Sessions
    )
    {
        public async Task AddMemberRowAsync(string userId)
        {
            Db.GameMembers.Add(
                new GameMember
                {
                    GameId = GameId,
                    UserId = userId,
                    JoinedAt = DateTimeOffset.UnixEpoch,
                    LastPlayedAt = DateTimeOffset.UnixEpoch,
                }
            );
            await Db.SaveChangesAsync();
        }
    }

    public sealed record TestConfiguration;

    public sealed record TestState(int Counter, bool IsOpen, IReadOnlySet<string> Members) : ISchemaVersioned
    {
        public int SchemaVersion => 1;
    }

    public sealed record TestView(int Counter);

    private sealed class TestRules
        : IGameConfigurator<TestConfiguration, TestState>,
            IGameStateProcessor<TestState>,
            IGameViewProjector<TestState, TestView>
    {
        public TestState InitializeGame(TestConfiguration configuration, IReadOnlyList<string> members, ulong seed) =>
            Open;

        public IReadOnlySet<string> GetMembers(TestState state) => state.Members;

        public IReadOnlyDictionary<string, IReadOnlySet<string>> GetMembersActions(TestState state) =>
            state.Members.ToDictionary(
                member => member,
                IReadOnlySet<string> (_) =>
                    state.IsOpen
                        ? new HashSet<string>(StringComparer.Ordinal) { Increment, Close }
                        : new HashSet<string>(StringComparer.Ordinal),
                StringComparer.Ordinal
            );

        public StepResult<TestState> Execute(TestState state, string member, string action) =>
            new(action == Close ? state with { IsOpen = false } : state with { Counter = state.Counter + 1 });

        public StepResult<TestState> AddMember(TestState state, string member) =>
            new(state with { Members = state.Members.Append(member).ToHashSet(StringComparer.Ordinal) });

        public StepResult<TestState> RemoveMember(TestState state, string member) =>
            new(state with { Members = state.Members.Where(m => m != member).ToHashSet(StringComparer.Ordinal) });

        public StepResult<TestState> Advance(TestState state) => new(state with { IsOpen = true });

        public TestView GetMemberView(TestState state, string member) => new(state.Counter);
    }
}
