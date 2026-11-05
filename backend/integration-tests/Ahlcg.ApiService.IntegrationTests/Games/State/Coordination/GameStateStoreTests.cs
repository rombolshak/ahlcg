using System.Data.Common;
using System.Diagnostics.Metrics;
using Ahlcg.ApiService.IntegrationTests.Fixture;
using Ahlcg.Rules.Fixture;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using StackExchange.Redis;
using Tablier.Data;
using Tablier.Engine;
using Tablier.Engine.History;
using Tablier.Engine.History.Rewind;
using Tablier.Games;
using Tablier.Games.Sessions;
using Tablier.Games.State.Cache;
using Tablier.Games.State.Coordination;
using Tablier.Games.State.Models;
using Tablier.Telemetry;

namespace Ahlcg.ApiService.IntegrationTests.Games.State.Coordination;

[Collection(AppCollection.Name)]
public class GameStateStoreTests(AppFixture fixture)
{
    [Fact]
    public async Task Execute_PostCommitCacheFailure_RecoversExactlyOnePersistedStepInANewGeneration()
    {
        await using var run = await CreateRun();
        var initial = await run.Engine.GetMemberState(run.GameId, run.MemberId);
        Assert.NotNull(initial);
        run.Cache.FailNextWrite = true;

        var committed = await run.Engine.Execute(run.GameId, run.MemberId, "shared:inc");
        var recovered = await run.Engine.GetMemberState(run.GameId, run.MemberId);

        Assert.Equal(1, committed);
        Assert.NotNull(recovered);
        Assert.NotEqual(initial.State.SyncId, recovered.State.SyncId);
        Assert.Equal(1, recovered.State.Engine.GameVersion);
        Assert.Equal(1, recovered.State.Game["shared"]!.GetValue<int>());
        Assert.Equal(1, await run.Db.GameSteps.CountAsync(step => step.GameId == run.GameId));
        Assert.Equal(0, recovered.State.Version);
    }

    [Fact]
    public async Task GetMemberState_ActualCacheLoss_RebuildsCompleteEnvelopeAndWarmReadsAvoidMetadataSql()
    {
        await using var run = await CreateRun();
        var initial = await run.Engine.GetMemberState(run.GameId, run.MemberId);
        Assert.NotNull(initial);
        await run.Engine.Execute(run.GameId, run.MemberId, "shared:inc");
        await run.Redis.GetDatabase().KeyDeleteAsync(CacheKeys.GetGameStateKey(run.GameId));

        var recovered = await run.Engine.GetMemberState(run.GameId, run.MemberId);
        var coldQueries = run.Probe.MetadataQueries;
        var warm = await run.Engine.GetMemberState(run.GameId, run.MemberId);

        Assert.NotNull(recovered);
        Assert.NotNull(warm);
        Assert.NotEqual(initial.State.SyncId, recovered.State.SyncId);
        Assert.Equal(recovered.State.SyncId, warm.State.SyncId);
        Assert.Equal(1, recovered.State.Engine.GameVersion);
        Assert.True(recovered.State.Engine.Members[run.MemberId]);
        Assert.Null(recovered.State.Engine.Proposal);
        Assert.Null(recovered.State.Engine.Outcome);
        Assert.Equal(coldQueries, run.Probe.MetadataQueries);
        Assert.True(coldQueries > 0);
    }

    private async Task<Run> CreateRun()
    {
        using var client = fixture.CreateClient();
        var memberId = await HubTestSupport.LoginAnonymouslyAsync(fixture, client);
        var gameId = await HubTestSupport.CreateGameAsync(client);
        var probe = new MetadataProbe();
        var db = new ApplicationDbContext(
            new DbContextOptionsBuilder<ApplicationDbContext>()
                .UseNpgsql(fixture.ConnectionString)
                .AddInterceptors(probe)
                .Options
        );
        var redis = await ConnectionMultiplexer.ConnectAsync(fixture.CacheConnectionString);
        var provider = new ServiceCollection().AddLogging().AddMetrics().AddSignalR().Services.BuildServiceProvider();
        var meterFactory = provider.GetRequiredService<IMeterFactory>();
        var metrics = new TablierMetrics(meterFactory);
        var cache = new FaultingCache(
            new GameStateCache<FixtureState>(
                redis,
                Options.Create(new GameStateCacheOptions()),
                metrics,
                NullLogger<GameStateCache<FixtureState>>.Instance
            )
        );
        var registry = new GameMutationRegistry(metrics, TimeProvider.System);
        var sessions = new GameSessions(meterFactory, NullLogger<GameSessions>.Instance);
        sessions.Join(gameId, memberId, "test-connection", DateTimeOffset.UtcNow);
        var hub = provider.GetRequiredService<IHubContext<GameHub, IGameClient>>();
        var history = new GameHistory<FixtureState>(db, NullLogger<GameHistory<FixtureState>>.Instance);
        var store = new GameStateStore<FixtureState>(
            cache,
            history,
            new RewindQueries(db, NullLogger<RewindQueries>.Instance),
            db,
            sessions,
            hub,
            metrics,
            TimeProvider.System,
            NullLogger<GameStateStore<FixtureState>>.Instance
        );
        var engine = new GameEngine<FixtureConfiguration, FixtureState, FixtureView>(
            new GameRules<FixtureConfiguration, FixtureState, FixtureView>(
                new FixtureConfigurator(),
                new FixtureStateProcessor(),
                new FixtureViewProjector()
            ),
            history,
            db,
            hub,
            Options.Create(new JsonHubProtocolOptions()),
            new GameAdmission(db, registry, NullLogger<GameAdmission>.Instance),
            registry,
            store,
            metrics,
            TimeProvider.System,
            NullLogger<GameEngine<FixtureConfiguration, FixtureState, FixtureView>>.Instance
        );
        return new Run(gameId, memberId, db, redis, provider, cache, engine, probe);
    }

    private sealed class FaultingCache(IGameStateCache<FixtureState> inner) : IGameStateCache<FixtureState>
    {
        public bool FailNextWrite { get; set; }

        public Task<GameState<FixtureState>?> Load(Guid gameId, CancellationToken ct = default) =>
            inner.Load(gameId, ct);

        public Task<bool> Write(
            Guid gameId,
            GameState<FixtureState>? expected,
            GameState<FixtureState> replacement,
            CancellationToken ct = default
        )
        {
            if (!FailNextWrite)
                return inner.Write(gameId, expected, replacement, ct);
            FailNextWrite = false;
            throw new InvalidOperationException("cache unavailable after commit");
        }
    }

    private sealed class MetadataProbe : DbCommandInterceptor
    {
        public int MetadataQueries { get; private set; }

        public override ValueTask<InterceptionResult<DbDataReader>> ReaderExecutingAsync(
            DbCommand command,
            CommandEventData eventData,
            InterceptionResult<DbDataReader> result,
            CancellationToken cancellationToken = default
        )
        {
            if (command.CommandText.Contains("WITH RECURSIVE live", StringComparison.Ordinal))
                MetadataQueries++;
            return ValueTask.FromResult(result);
        }
    }

    private sealed record Run(
        Guid GameId,
        string MemberId,
        ApplicationDbContext Db,
        ConnectionMultiplexer Redis,
        ServiceProvider Provider,
        FaultingCache Cache,
        GameEngine<FixtureConfiguration, FixtureState, FixtureView> Engine,
        MetadataProbe Probe
    ) : IAsyncDisposable
    {
        public async ValueTask DisposeAsync()
        {
            await Db.DisposeAsync();
            await Redis.DisposeAsync();
            await Provider.DisposeAsync();
        }
    }
}
