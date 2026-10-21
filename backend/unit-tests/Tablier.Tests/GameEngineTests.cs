using Microsoft.AspNetCore.SignalR;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using Moq;
using Tablier.Contract;

namespace Tablier.Tests;

public class GameEngineTests
{
    private const string Member = "alice";
    private const string Increment = "inc";
    private const string Close = "close";

    private static readonly Guid GameId = Guid.NewGuid();

    private static readonly TestState Open = new(Counter: 0, IsOpen: true);
    private static readonly TestState Closed = new(Counter: 0, IsOpen: false);

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
    public async Task Execute_StaleStateDoesNotOfferAction_InvalidatesAndExecutesOnTheFreshRead()
    {
        // given
        var run = CreateRun(loads: [Closed, Open], appends: [true]);

        // when
        var executed = await run.Engine.Execute(GameId, Member, Increment, CancellationToken.None);

        // then
        Assert.True(executed);
        run.History.Verify(h => h.Invalidate(GameId, It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task Execute_FreshStateDoesNotOfferActionEither_ReturnsFalseWithoutAppending()
    {
        // given
        var run = CreateRun(loads: [Closed, Closed], appends: []);

        // when
        var executed = await run.Engine.Execute(GameId, Member, Increment, CancellationToken.None);

        // then
        Assert.False(executed);
        run.History.Verify(h => h.Invalidate(GameId, It.IsAny<CancellationToken>()), Times.Once);
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
        clients.Setup(c => c.Group(GameHub.GetMemberGroupName(GameId, Member))).Returns(client.Object);
        var hub = new Mock<IHubContext<GameHub, IGameClient>>();
        hub.Setup(h => h.Clients).Returns(clients.Object);

        var rules = new TestRules();
        var engine = new GameEngine<TestConfiguration, TestState, TestView>(
            new GameRules<TestConfiguration, TestState, TestView>(rules, rules, rules),
            history.Object,
            hub.Object,
            Options.Create(new JsonHubProtocolOptions()),
            NullLogger<GameEngine<TestConfiguration, TestState, TestView>>.Instance
        );
        return new Run(engine, history, client);
    }

    private sealed record Run(
        GameEngine<TestConfiguration, TestState, TestView> Engine,
        Mock<IGameHistory<TestState>> History,
        Mock<IGameClient> Client
    );

    public sealed record TestConfiguration;

    public sealed record TestState(int Counter, bool IsOpen) : ISchemaVersioned
    {
        public int SchemaVersion => 1;
    }

    public sealed record TestView(int Counter);

    private sealed class TestRules
        : IGameConfigurator<TestConfiguration, TestState>,
            IGameStateProcessor<TestState>,
            IGameViewProjector<TestState, TestView>
    {
        private static readonly IReadOnlySet<string> Members = new HashSet<string>(StringComparer.Ordinal) { Member };

        public TestState InitializeGame(TestConfiguration configuration, IReadOnlyList<string> members, ulong seed) =>
            Open;

        public IReadOnlySet<string> GetMembers(TestState state) => Members;

        public IReadOnlyDictionary<string, IReadOnlySet<string>> GetMembersActions(TestState state) =>
            new Dictionary<string, IReadOnlySet<string>>(StringComparer.Ordinal)
            {
                [Member] = state.IsOpen
                    ? new HashSet<string>(StringComparer.Ordinal) { Increment, Close }
                    : new HashSet<string>(StringComparer.Ordinal),
            };

        public StepResult<TestState> Execute(TestState state, string member, string action) =>
            new(action == Close ? state with { IsOpen = false } : state with { Counter = state.Counter + 1 });

        public StepResult<TestState> Advance(TestState state) => new(state with { IsOpen = true });

        public TestView GetMemberView(TestState state, string member) => new(state.Counter);
    }
}
