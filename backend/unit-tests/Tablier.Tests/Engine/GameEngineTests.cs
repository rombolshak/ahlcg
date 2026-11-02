using System.Text.Json;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Logging.Testing;
using Microsoft.Extensions.Options;
using Moq;
using StackExchange.Redis;
using Tablier.Contract;
using Tablier.Data;
using Tablier.Engine;
using Tablier.Engine.History;
using Tablier.Engine.History.Rewind;
using Tablier.Games;

namespace Tablier.Tests.Engine;

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
    public async Task RequestRewind_RestoresPendingCheckpointThenAdvancesAsSeparateStep()
    {
        var run = CreateRun(loads: [Open], appends: [true]);
        await run.AddMemberRowAsync(Member);
        var random = GameRandom.FromSeed(42);
        var target = Closed with { Counter = 7, Random = random, Journal = "entry" };
        var advanced = target with { IsOpen = true };
        var current = new StoredState<TestState>(2, Open);
        var restored = new StoredState<TestState>(3, target);
        var path = RewindHistory.Create(
            2,
            [
                new RewindStep(1, Member, "checkpoint", IsBarrier: false, RestoredVersion: null),
                new RewindStep(2, Member, Checkpoint: null, IsBarrier: false, RestoredVersion: null),
            ],
            hasInitial: true
        );
        run.History.Setup(h => h.LoadCurrent(GameId, It.IsAny<CancellationToken>())).ReturnsAsync(current);
        run.History.Setup(h => h.GetRewindHistory(GameId, 2, It.IsAny<CancellationToken>())).ReturnsAsync(path);
        run.History.Setup(h => h.Restore(GameId, current, 1, It.IsAny<CancellationToken>())).ReturnsAsync(restored);
        var proposal = new RewindProposal(Guid.NewGuid(), 3, 1, Member, [Leaver], []);
        run.RedisDatabase.SetupSequence(d => d.StringGetAsync(It.IsAny<RedisKey>(), It.IsAny<CommandFlags>()))
            .ReturnsAsync(RedisValue.Null)
            .ReturnsAsync((RedisValue)JsonSerializer.Serialize(proposal));
        run.RedisDatabase.Setup(d =>
                d.ScriptEvaluateAsync(
                    It.IsAny<string>(),
                    It.IsAny<RedisKey[]>(),
                    It.IsAny<RedisValue[]>(),
                    It.IsAny<CommandFlags>()
                )
            )
            .ReturnsAsync(RedisResult.Create((RedisValue)1));
        var changes = new List<StateChange>();
        run.Client.Setup(c => c.StateChanged(It.IsAny<StateChange>()))
            .Callback<StateChange>(changes.Add)
            .Returns(Task.CompletedTask);

        Assert.True(await run.Engine.RequestRewind(GameId, Member, 1, CancellationToken.None));

        run.History.Verify(h => h.Restore(GameId, current, 1, It.IsAny<CancellationToken>()), Times.Once);
        run.History.Verify(
            h =>
                h.Append(
                    GameId,
                    restored,
                    It.Is<StepResult<TestState>>(result => result.State == advanced && result.Checkpoint == null),
                    choice: null,
                    It.IsAny<CancellationToken>()
                ),
            Times.Once
        );
        Assert.Equal([3, 4], changes.Select(c => c.Version));
        Assert.Empty(changes[0].Actions);
        Assert.NotEmpty(changes[1].Actions);
        run.Client.Verify(c => c.RewindProposalChanged(), Times.Once);
    }

    [Fact]
    public async Task GetRewindTargets_NonMember_LogsWarning()
    {
        var logger = new FakeLogger<GameEngine<TestConfiguration, TestState, TestView>>();
        var run = CreateRun(loads: [Open], appends: [], logger);

        Assert.Null(await run.Engine.GetRewindTargets(GameId, Member, CancellationToken.None));

        Assert.Equal(LogLevel.Warning, logger.LatestRecord.Level);
        Assert.Equal("LogRewindRefusedNotMember", logger.LatestRecord.Id.Name);
    }

    [Fact]
    public async Task Execute_AutomaticStep_InvalidatesProposalOpenedAfterPlayerStep()
    {
        var run = CreateRun(loads: [Open], appends: [true, true]);
        await run.AddMemberRowAsync(Member);
        var proposal = new RewindProposal(Guid.NewGuid(), 1, 0, Member, [Leaver], []);
        run.RedisDatabase.SetupSequence(d => d.StringGetAsync(It.IsAny<RedisKey>(), It.IsAny<CommandFlags>()))
            .ReturnsAsync(RedisValue.Null)
            .ReturnsAsync((RedisValue)JsonSerializer.Serialize(proposal));
        run.RedisDatabase.Setup(d =>
                d.ScriptEvaluateAsync(
                    It.IsAny<string>(),
                    It.IsAny<RedisKey[]>(),
                    It.IsAny<RedisValue[]>(),
                    It.IsAny<CommandFlags>()
                )
            )
            .ReturnsAsync(RedisResult.Create((RedisValue)1));

        Assert.Equal(1, await run.Engine.Execute(GameId, Member, Close, CancellationToken.None));

        run.Client.Verify(c => c.RewindProposalChanged(), Times.Once);
        run.RedisDatabase.Verify(
            d =>
                d.ScriptEvaluateAsync(
                    It.IsAny<string>(),
                    It.IsAny<RedisKey[]>(),
                    It.IsAny<RedisValue[]>(),
                    It.IsAny<CommandFlags>()
                ),
            Times.Once
        );
    }

    [Fact]
    public async Task AnswerRewind_HintFails_StillRestoresBeforeSendingHint()
    {
        var run = CreateRun(loads: [Open], appends: []);
        await run.AddMemberRowAsync(Member);
        var proposal = new RewindProposal(Guid.NewGuid(), 1, 0, Leaver, [Member], []);
        run.RedisDatabase.SetupSequence(d => d.StringGetAsync(It.IsAny<RedisKey>(), It.IsAny<CommandFlags>()))
            .ReturnsAsync((RedisValue)JsonSerializer.Serialize(proposal))
            .ReturnsAsync(RedisValue.Null);
        run.RedisDatabase.Setup(d =>
                d.ScriptEvaluateAsync(
                    It.IsAny<string>(),
                    It.IsAny<RedisKey[]>(),
                    It.IsAny<RedisValue[]>(),
                    It.IsAny<CommandFlags>()
                )
            )
            .ReturnsAsync(RedisResult.Create((RedisValue)1));
        var path = RewindHistory.Create(
            1,
            [new RewindStep(1, Member, Checkpoint: null, IsBarrier: false, RestoredVersion: null)],
            hasInitial: true
        );
        run.History.Setup(h => h.GetRewindHistory(GameId, 1, It.IsAny<CancellationToken>())).ReturnsAsync(path);
        run.History.Setup(h => h.LoadCurrent(GameId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new StoredState<TestState>(1, Open));
        run.History.Setup(h => h.Restore(GameId, It.IsAny<StoredState<TestState>>(), 0, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new StoredState<TestState>(2, Open));
        run.Client.Setup(c => c.RewindProposalChanged()).ThrowsAsync(new InvalidOperationException());

        await Assert.ThrowsAsync<InvalidOperationException>(() =>
            run.Engine.AnswerRewind(GameId, Member, proposal.Id, approve: true, CancellationToken.None)
        );

        run.History.Verify(
            h => h.Restore(GameId, It.IsAny<StoredState<TestState>>(), 0, It.IsAny<CancellationToken>()),
            Times.Once
        );
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

    private static Run CreateRun(
        TestState[] loads,
        bool[] appends,
        FakeLogger<GameEngine<TestConfiguration, TestState, TestView>>? logger = null
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
        var redisDatabase = new Mock<IDatabase>();
        redisDatabase
            .Setup(d => d.StringGetAsync(It.IsAny<RedisKey>(), It.IsAny<CommandFlags>()))
            .ReturnsAsync(RedisValue.Null);
        var redis = new Mock<IConnectionMultiplexer>();
        redis.Setup(r => r.GetDatabase(It.IsAny<int>(), It.IsAny<object>())).Returns(redisDatabase.Object);
        var engine = new GameEngine<TestConfiguration, TestState, TestView>(
            new GameRules<TestConfiguration, TestState, TestView>(rules, rules, rules),
            history.Object,
            new RewindProposals(redis.Object),
            db,
            hub.Object,
            Options.Create(new JsonHubProtocolOptions()),
            logger
                ?? (ILogger<GameEngine<TestConfiguration, TestState, TestView>>)
                    NullLogger<GameEngine<TestConfiguration, TestState, TestView>>.Instance
        );
        return new Run(engine, history, client, db, redisDatabase);
    }

    private sealed record Run(
        GameEngine<TestConfiguration, TestState, TestView> Engine,
        Mock<IGameHistory<TestState>> History,
        Mock<IGameClient> Client,
        ApplicationDbContext Db,
        Mock<IDatabase> RedisDatabase
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

        public GameRandom Random { get; init; }

        public string Journal { get; init; } = string.Empty;
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
