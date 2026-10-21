using System.Diagnostics.Metrics;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using Moq;
using Tablier.Contract;
using Tablier.Data;

namespace Tablier.Tests;

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
    public async Task Execute_AppendRefusedOnce_RetriesAndSendsStateChangedOnce()
    {
        // given
        var run = CreateRun(loads: [Open], appends: [false, true]);

        // when
        var executed = await run.Engine.Execute(GameId, Member, Increment, CancellationToken.None);

        // then
        Assert.True(executed);
        run.Client.Verify(c => c.StateChanged(It.IsAny<StateChange>()), Times.Once);
    }

    [Fact]
    public async Task Execute_AppendRefusedOnEveryAttempt_ReturnsFalseAndSendsNothing()
    {
        // given
        var run = CreateRun(loads: [Open], appends: [false, false, false]);

        // when
        var executed = await run.Engine.Execute(GameId, Member, Increment, CancellationToken.None);

        // then
        Assert.False(executed);
        run.Client.Verify(c => c.StateChanged(It.IsAny<StateChange>()), Times.Never);
    }

    [Fact]
    public async Task Execute_StateDoesNotOfferAction_ReturnsFalseWithoutAppending()
    {
        // given
        var run = CreateRun(loads: [Closed], appends: []);

        // when
        var executed = await run.Engine.Execute(GameId, Member, Increment, CancellationToken.None);

        // then
        Assert.False(executed);
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
    public async Task Execute_AdvanceAppendRefused_StillReturnsTrueAndSendsOnlyThePlayerStep()
    {
        // given
        var run = CreateRun(loads: [Open], appends: [true, false]);

        // when
        var executed = await run.Engine.Execute(GameId, Member, Close, CancellationToken.None);

        // then
        Assert.True(executed);
        run.Client.Verify(c => c.StateChanged(It.IsAny<StateChange>()), Times.Once);
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

    private static Run CreateRun(TestState[] loads, bool[] appends)
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

        var metrics = new GameEngineMetrics(
            new ServiceCollection().AddMetrics().BuildServiceProvider().GetRequiredService<IMeterFactory>()
        );

        var rules = new TestRules();
        var engine = new GameEngine<TestConfiguration, TestState, TestView>(
            new GameRules<TestConfiguration, TestState, TestView>(rules, rules, rules),
            history.Object,
            db,
            hub.Object,
            Options.Create(new JsonHubProtocolOptions()),
            metrics,
            TimeProvider.System,
            NullLogger<GameEngine<TestConfiguration, TestState, TestView>>.Instance
        );
        return new Run(engine, history, client, db);
    }

    private sealed record Run(
        GameEngine<TestConfiguration, TestState, TestView> Engine,
        Mock<IGameHistory<TestState>> History,
        Mock<IGameClient> Client,
        ApplicationDbContext Db
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
