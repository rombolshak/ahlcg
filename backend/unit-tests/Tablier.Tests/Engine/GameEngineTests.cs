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
using Tablier.Engine;
using Tablier.Engine.History;
using Tablier.Engine.History.Rewind;
using Tablier.Games;
using Tablier.Games.State.Coordination;
using Tablier.Games.State.Models;
using Tablier.Telemetry;

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
    private static readonly TestState OpenPair = new(Counter: 0, IsOpen: true, Members: Pair);

    [Fact]
    public async Task Execute_AppendRefused_RepairsWithoutReplaying()
    {
        // given
        var run = CreateRun(loads: [Open], appends: [false]);

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
        var run = CreateRun(loads: [Open], appends: []);

        // when
        var executed = await run.Engine.Execute(GameId, Member, "missing", CancellationToken.None);

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
    public async Task SyncMembers_AppendRefused_DoesNotRepeatTheTransition()
    {
        // given
        var run = CreateRun(loads: [OpenPair], appends: [false, true]);
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
            Times.Once
        );
        run.Client.Verify(c => c.StateChanged(It.IsAny<StateChange>()), Times.Never);
    }

    [Fact]
    public async Task Execute_CacheRefusesCommittedStep_ReturnsCommittedVersionWithoutReplaying()
    {
        var run = CreateRun(loads: [Open], appends: [true]);
        run.States.AcceptWrites = false;

        var version = await run.Engine.Execute(GameId, Member, Increment);

        Assert.Equal(1, version);
        run.Client.Verify(client => client.StateChanged(It.IsAny<StateChange>()), Times.Never);
        run.History.Verify(
            history =>
                history.Append(
                    GameId,
                    It.IsAny<StoredState<TestState>>(),
                    It.IsAny<StepResult<TestState>>(),
                    It.IsAny<PlayerChoice?>(),
                    It.IsAny<CancellationToken>()
                ),
            Times.Once
        );
    }

    [Fact]
    public async Task Execute_PublicationFails_ReturnsCommittedVersionWithoutReplaying()
    {
        var run = CreateRun(loads: [Open], appends: [true]);
        run.Client.Setup(client => client.StateChanged(It.IsAny<StateChange>()))
            .ThrowsAsync(new InvalidOperationException("delivery failed"));

        var version = await run.Engine.Execute(GameId, Member, Increment);

        Assert.Equal(1, version);
        run.History.Verify(
            history =>
                history.Append(
                    GameId,
                    It.IsAny<StoredState<TestState>>(),
                    It.IsAny<StepResult<TestState>>(),
                    It.IsAny<PlayerChoice?>(),
                    It.IsAny<CancellationToken>()
                ),
            Times.Once
        );
    }

    [Fact]
    public async Task Execute_AppendOutcomeUnknown_AttributesMatchingNextRowAndReturnsCommittedVersion()
    {
        var run = CreateRun(loads: [Open], appends: []);
        ConfigureUnknownCommit(run, mismatch: null);

        var acknowledged = await run.Engine.Execute(GameId, Member, Increment);

        Assert.Equal(1, acknowledged);
        AssertOnePlayerAttempt(run);
    }

    [Theory]
    [InlineData("actor")]
    [InlineData("action")]
    [InlineData("version")]
    [InlineData("checkpoint")]
    [InlineData("irreversible")]
    [InlineData("baseline")]
    [InlineData("restore")]
    [InlineData("state")]
    [InlineData("non_commit")]
    public async Task Execute_AppendOutcomeUnknown_DoesNotAttributeMismatchedOrMissingCommit(string mismatch)
    {
        var run = CreateRun(loads: [Open], appends: []);
        ConfigureUnknownCommit(run, mismatch);

        var acknowledged = await run.Engine.Execute(GameId, Member, Increment);

        Assert.Null(acknowledged);
        AssertOnePlayerAttempt(run);
    }

    [Fact]
    public async Task Execute_AppendOutcomeUnknownAndRecoveryFails_LeavesRecoveryPendingWithoutReplay()
    {
        var run = CreateRun(loads: [Open], appends: []);
        ConfigureUnknownCommit(run, mismatch: null);
        var failure = new InvalidOperationException("recovery unavailable");
        run.States.RecoveryFailure = failure;

        var error = await Assert.ThrowsAsync<InvalidOperationException>(() =>
            run.Engine.Execute(GameId, Member, Increment)
        );

        Assert.Same(failure, error);
        using var lease = await run.Registry.Acquire(GameId);
        Assert.True(lease.IsDirty);
        AssertOnePlayerAttempt(run);
    }

    private static void ConfigureUnknownCommit(Run run, string? mismatch)
    {
        var row = new GameStep
        {
            GameId = GameId,
            Version = 1,
            Actor = Member,
            Action = Increment,
            Patch = System.Text.Json.JsonDocument.Parse("[]"),
        };
        switch (mismatch)
        {
            case "actor":
                row.Actor = Leaver;
                break;
            case "action":
                row.Action = Close;
                break;
            case "checkpoint":
                row.Checkpoint = "different";
                break;
            case "irreversible":
                row.IsIrreversible = true;
                break;
            case "baseline":
                row.IsBaseline = true;
                break;
            case "restore":
                row.RestoredVersion = 0;
                break;
        }
        if (mismatch != "non_commit")
        {
            run.Db.GameSteps.Add(row);
            run.Db.SaveChanges();
        }
        var version =
            mismatch == "non_commit" ? 0
            : mismatch == "version" ? 2
            : 1;
        var state = mismatch == "non_commit" ? Open : Open with { Counter = mismatch == "state" ? 2 : 1 };
        run.States.RecoverAt(version, state);
        run.History.Setup(history =>
                history.Append(
                    GameId,
                    It.IsAny<StoredState<TestState>>(),
                    It.IsAny<StepResult<TestState>>(),
                    It.IsAny<PlayerChoice?>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .ThrowsAsync(new InvalidOperationException("commit acknowledgement unavailable"));
    }

    private static void AssertOnePlayerAttempt(Run run) =>
        run.History.Verify(
            history =>
                history.Append(
                    GameId,
                    It.IsAny<StoredState<TestState>>(),
                    It.IsAny<StepResult<TestState>>(),
                    new PlayerChoice(Member, Increment),
                    It.IsAny<CancellationToken>()
                ),
            Times.Once
        );

    private static Run CreateRun(TestState[] loads, bool[] appends)
    {
        var history = CreateHistory(appends);
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

        var game = new Game
        {
            Id = GameId,
            OwnerId = Member,
            IdempotencyKey = Guid.NewGuid().ToString(),
            Configuration = System.Text.Json.JsonDocument.Parse("{}"),
        };
        db.Games.Add(game);
        db.GameMembers.Add(new GameMember { GameId = GameId, UserId = Member });
        db.SaveChanges();
        var metrics = new TablierMetrics(
            new ServiceCollection().AddMetrics().BuildServiceProvider().GetRequiredService<IMeterFactory>()
        );
        var registry = new GameMutationRegistry(metrics, TimeProvider.System);
        var admission = new GameAdmission(db, registry, NullLogger<GameAdmission>.Instance);
        var states = new ControlledStates(loads[0]);
        var rules = new TestRules();
        var engine = new GameEngine<TestConfiguration, TestState, TestView>(
            new GameRules<TestConfiguration, TestState, TestView>(rules, rules, rules),
            history.Object,
            db,
            hub.Object,
            Options.Create(new JsonHubProtocolOptions()),
            admission,
            registry,
            states,
            metrics,
            TimeProvider.System,
            NullLogger<GameEngine<TestConfiguration, TestState, TestView>>.Instance
        );
        return new Run(engine, history, client, db, states, registry);
    }

    private static Mock<IGameHistory<TestState>> CreateHistory(bool[] appends)
    {
        var history = new Mock<IGameHistory<TestState>>();
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

        return history;
    }

    private sealed class ControlledStates(TestState initial) : IGameStateStore<TestState>
    {
        private GameState<TestState> _state = new(
            Guid.CreateVersion7(),
            0,
            new EngineState(
                0,
                initial.Members.ToDictionary(member => member, _ => false, StringComparer.Ordinal),
                MemberId: null,
                InviteCode: null,
                RewindMetadata.Empty
            ),
            initial
        );
        private GameState<TestState>? _recoveryState;
        public bool AcceptWrites { get; set; } = true;
        public Exception? RecoveryFailure { get; set; }

        public void RecoverAt(int gameVersion, TestState state) =>
            _recoveryState = _state with
            {
                SyncId = Guid.CreateVersion7(),
                Version = 0,
                Game = state,
                Engine = _state.Engine with
                {
                    GameVersion = gameVersion,
                    Rewind = RewindMetadata.Empty with { GameVersion = gameVersion },
                },
            };

        public Task<GameState<TestState>?> Load(GameMutationLease lease, CancellationToken ct = default)
        {
            if (lease.IsDirty && _recoveryState is not null)
            {
                if (RecoveryFailure is not null)
                    throw RecoveryFailure;
                _state = _recoveryState;
                lease.IsDirty = false;
            }
            return Task.FromResult<GameState<TestState>?>(_state);
        }

        public Task<EngineState> ReadEngine(
            Guid gameId,
            int gameVersion,
            RewindMetadata metadata,
            CancellationToken ct = default
        ) => Task.FromResult(_state.Engine with { GameVersion = gameVersion, Rewind = metadata });

        public Task<bool> Install(
            GameMutationLease lease,
            GameState<TestState> previous,
            GameState<TestState> replacement,
            CancellationToken ct = default
        )
        {
            if (AcceptWrites)
            {
                _state = replacement;
                lease.IsDirty = false;
            }
            return Task.FromResult(AcceptWrites);
        }
    }

    private sealed record Run(
        GameEngine<TestConfiguration, TestState, TestView> Engine,
        Mock<IGameHistory<TestState>> History,
        Mock<IGameClient> Client,
        ApplicationDbContext Db,
        ControlledStates States,
        GameMutationRegistry Registry
    )
    {
        public async Task AddMemberRowAsync(string userId)
        {
            if (await Db.GameMembers.AnyAsync(member => member.GameId == GameId && member.UserId == userId))
                return;
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
