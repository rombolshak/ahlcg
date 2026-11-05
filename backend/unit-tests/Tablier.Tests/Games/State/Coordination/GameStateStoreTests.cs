using System.Diagnostics.Metrics;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Diagnostics.Metrics.Testing;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using Tablier.Contract;
using Tablier.Data;
using Tablier.Engine.History;
using Tablier.Engine.History.Rewind;
using Tablier.Games;
using Tablier.Games.Sessions;
using Tablier.Games.State.Cache;
using Tablier.Games.State.Coordination;
using Tablier.Games.State.Models;
using Tablier.Telemetry;

namespace Tablier.Tests.Games.State.Coordination;

public class GameStateStoreTests
{
    [Fact]
    public async Task Load_MissingCache_InstallsCompleteBaselineAndSendsOnlyReset()
    {
        await using var run = CreateRun(cached: null);
        using var lease = await run.Registry.Acquire(run.GameId);

        var state = await run.Store.Load(lease);

        Assert.NotNull(state);
        Assert.Equal(0, state.Version);
        Assert.Equal(5, state.Engine.GameVersion);
        Assert.Equal(7, state.Game.Counter);
        Assert.Equal(3, state.Engine.Rewind.Checkpoints["turn"]);
        Assert.True(state.Engine.Members["alice"]);
        Assert.NotNull(state.Engine.InviteCode);
        Assert.Null(state.Engine.Proposal);
        Assert.Null(state.Engine.Outcome);
        run.Cache.Verify(
            cache => cache.Write(run.GameId, expected: null, state, It.IsAny<CancellationToken>()),
            Times.Once
        );
        run.Client.Verify(
            client => client.StateChanged(It.Is<ResetRequired>(change => change.SyncId == state.SyncId)),
            Times.Once
        );
        Assert.False(lease.IsDirty);
    }

    [Fact]
    public async Task Load_WarmActivatedCache_DoesNotReconstructHistoryMetadata()
    {
        var cached = CreateState();
        await using var run = CreateRun(cached);
        using var lease = await run.Registry.Acquire(run.GameId);
        lease.IsActivated = true;

        var state = await run.Store.Load(lease);

        Assert.Same(cached, state);
        run.History.Verify(
            history => history.LoadCurrent(It.IsAny<Guid>(), It.IsAny<CancellationToken>()),
            Times.Never
        );
        run.Rewind.Verify(
            rewind => rewind.Load(It.IsAny<Guid>(), It.IsAny<int>(), It.IsAny<CancellationToken>()),
            Times.Never
        );
        run.Client.Verify(client => client.StateChanged(It.IsAny<StateChange>()), Times.Never);
    }

    [Fact]
    public async Task Load_DirtyEnvelope_RebuildsCommittedGameWithoutLostTransientRecords()
    {
        var cached = CreateState();
        await using var run = CreateRun(cached);
        using var lease = await run.Registry.Acquire(run.GameId);
        lease.IsDirty = true;
        lease.IsActivated = true;

        var state = await run.Store.Load(lease);

        Assert.NotNull(state);
        Assert.NotEqual(cached.SyncId, state.SyncId);
        Assert.Equal(5, state.Engine.GameVersion);
        Assert.Equal(0, state.Version);
        run.History.Verify(
            history =>
                history.Append(
                    It.IsAny<Guid>(),
                    It.IsAny<StoredState<TestState>>(),
                    It.IsAny<StepResult<TestState>>(),
                    It.IsAny<PlayerChoice?>(),
                    It.IsAny<CancellationToken>()
                ),
            Times.Never
        );
    }

    [Theory]
    [InlineData(5, true)]
    [InlineData(4, false)]
    public async Task Load_ActivationWithCachedProposal_RetainsOnlyHeadConsistentTransientRecords(
        int sourceVersion,
        bool retain
    )
    {
        var cached = CreateState();
        var proposal = new RewindProposal(
            Guid.CreateVersion7(),
            sourceVersion,
            "alice",
            new RewindDestination("undo", 2, CheckpointId: null),
            new HashSet<string>(StringComparer.Ordinal) { "bob" },
            new HashSet<string>(StringComparer.Ordinal),
            DateTimeOffset.UnixEpoch
        );
        cached = cached with { Engine = cached.Engine with { Proposal = proposal } };
        await using var run = CreateRun(cached);
        using var lease = await run.Registry.Acquire(run.GameId);

        var recovered = await run.Store.Load(lease);

        Assert.NotNull(recovered);
        Assert.Equal(retain ? proposal : null, recovered.Engine.Proposal);
    }

    [Fact]
    public async Task Load_RecoveryWriteFails_LeavesRecoveryPending()
    {
        await using var run = CreateRun(CreateState());
        using var lease = await run.Registry.Acquire(run.GameId);
        lease.IsDirty = true;
        run.Cache.Setup(cache =>
                cache.Write(
                    It.IsAny<Guid>(),
                    It.IsAny<GameState<TestState>?>(),
                    It.IsAny<GameState<TestState>>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .ReturnsAsync(value: false);

        await Assert.ThrowsAsync<InvalidOperationException>(() => run.Store.Load(lease));

        Assert.True(lease.IsDirty);
        run.Client.Verify(client => client.StateChanged(It.IsAny<StateChange>()), Times.Never);
    }

    [Fact]
    public async Task Install_CacheThrows_MarksDirtyWithoutRetry()
    {
        var previous = CreateState();
        await using var run = CreateRun(previous);
        using var lease = await run.Registry.Acquire(run.GameId);
        run.Cache.Setup(cache =>
                cache.Write(
                    It.IsAny<Guid>(),
                    It.IsAny<GameState<TestState>?>(),
                    It.IsAny<GameState<TestState>>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .ThrowsAsync(new InvalidOperationException("cache failed"));

        var accepted = await run.Store.Install(lease, previous, previous with { Version = 1 });

        Assert.False(accepted);
        Assert.True(lease.IsDirty);
        run.Cache.Verify(
            cache =>
                cache.Write(
                    It.IsAny<Guid>(),
                    It.IsAny<GameState<TestState>?>(),
                    It.IsAny<GameState<TestState>>(),
                    It.IsAny<CancellationToken>()
                ),
            Times.Once
        );
    }

    [Fact]
    public async Task Load_ResetDeliveryFails_RecordsOneFailedPublicationAfterInstallingBaseline()
    {
        await using var run = CreateRun(cached: null);
        using var publication = new MetricCollector<double>(
            run.MeterFactory,
            TablierMetrics.MeterName,
            "tablier.session.publication.duration",
            TimeProvider.System
        );
        using var lease = await run.Registry.Acquire(run.GameId);
        run.Client.Setup(client => client.StateChanged(It.IsAny<StateChange>()))
            .ThrowsAsync(new InvalidOperationException("delivery unavailable"));

        var state = await run.Store.Load(lease);

        Assert.NotNull(state);
        Assert.False(lease.IsDirty);
        var measurement = Assert.Single(publication.GetMeasurementSnapshot());
        Assert.True(
            measurement.MatchesTags([
                new KeyValuePair<string, object?>("kind", "reset_required"),
                new("outcome", "error"),
            ])
        );
        run.Cache.Verify(
            cache => cache.Write(run.GameId, expected: null, state, It.IsAny<CancellationToken>()),
            Times.Once
        );
    }

    private static Run CreateRun(GameState<TestState>? cached)
    {
        var gameId = Guid.NewGuid();
        var db = CreateDb(gameId);
        var cache = new Mock<IGameStateCache<TestState>>();
        cache.Setup(value => value.Load(gameId, It.IsAny<CancellationToken>())).ReturnsAsync(cached);
        cache
            .Setup(value =>
                value.Write(
                    gameId,
                    It.IsAny<GameState<TestState>?>(),
                    It.IsAny<GameState<TestState>>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .ReturnsAsync(value: true);
        var history = new Mock<IGameHistory<TestState>>();
        history
            .Setup(value => value.LoadCurrent(gameId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new StoredState<TestState>(5, new TestState(7)));
        var rewind = new Mock<IRewindQueries>();
        rewind
            .Setup(value => value.Load(gameId, 5, It.IsAny<CancellationToken>()))
            .ReturnsAsync(CreateState().Engine.Rewind);
        var meterFactory = new ServiceCollection()
            .AddMetrics()
            .BuildServiceProvider()
            .GetRequiredService<IMeterFactory>();
        var metrics = new TablierMetrics(meterFactory);
        var registry = new GameMutationRegistry(metrics, TimeProvider.System);
        var sessions = new GameSessions(meterFactory, NullLogger<GameSessions>.Instance);
        sessions.Join(gameId, "alice", "connection", DateTimeOffset.UnixEpoch);
        var client = new Mock<IGameClient>();
        var clients = new Mock<IHubClients<IGameClient>>();
        clients.Setup(value => value.Group(It.IsAny<string>())).Returns(client.Object);
        var hub = new Mock<IHubContext<GameHub, IGameClient>>();
        hub.Setup(value => value.Clients).Returns(clients.Object);
        var store = new GameStateStore<TestState>(
            cache.Object,
            history.Object,
            rewind.Object,
            db,
            sessions,
            hub.Object,
            metrics,
            TimeProvider.System,
            NullLogger<GameStateStore<TestState>>.Instance
        );
        return new Run(gameId, db, store, registry, meterFactory, cache, history, rewind, client);
    }

    private static ApplicationDbContext CreateDb(Guid gameId)
    {
        var db = new ApplicationDbContext(
            new DbContextOptionsBuilder<ApplicationDbContext>()
                .UseInMemoryDatabase(Guid.NewGuid().ToString())
                .ConfigureWarnings(warnings => warnings.Ignore(InMemoryEventId.TransactionIgnoredWarning))
                .Options
        );
        var game = new Game
        {
            Id = gameId,
            OwnerId = "alice",
            IdempotencyKey = "creation",
            Configuration = System.Text.Json.JsonDocument.Parse("{}"),
            IntendedPlayersCount = 2,
        };
        game.Members.Add(new GameMember { UserId = "alice" });
        db.Games.Add(game);
        db.SaveChanges();
        return db;
    }

    private static GameState<TestState> CreateState() =>
        new(
            Guid.CreateVersion7(),
            7,
            new EngineState(
                5,
                new Dictionary<string, bool>(StringComparer.Ordinal) { ["alice"] = false },
                MemberId: null,
                InviteCode: null,
                new RewindMetadata(
                    5,
                    0,
                    new Dictionary<string, int>(StringComparer.Ordinal) { ["turn"] = 3 },
                    new UndoTarget(2, "alice")
                )
            ),
            new TestState(7)
        );

    private sealed record Run(
        Guid GameId,
        ApplicationDbContext Db,
        GameStateStore<TestState> Store,
        GameMutationRegistry Registry,
        IMeterFactory MeterFactory,
        Mock<IGameStateCache<TestState>> Cache,
        Mock<IGameHistory<TestState>> History,
        Mock<IRewindQueries> Rewind,
        Mock<IGameClient> Client
    ) : IAsyncDisposable
    {
        public ValueTask DisposeAsync() => Db.DisposeAsync();
    }

    public sealed record TestState(int Counter) : ISchemaVersioned
    {
        public int SchemaVersion => 1;
    }
}
