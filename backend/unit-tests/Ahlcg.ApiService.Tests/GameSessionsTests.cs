using System.Diagnostics.Metrics;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Diagnostics.Metrics.Testing;

namespace Ahlcg.ApiService.Tests;

public class GameSessionsTests
{
    [Fact]
    public void Join_FirstConnection_StartsNewSession()
    {
        var sessions = CreateSessions();
        var gameId = Guid.NewGuid();

        var change = sessions.Join(gameId, UserA, "conn-1", FixedStart);

        Assert.True(change.MemberPresenceChanged);
        Assert.Equal(FixedStart, change.Session!.StartedAt);
        Assert.Equal(1, sessions.Count);
    }

    [Fact]
    public void Join_SecondMemberSameGame_JoinsExistingSession()
    {
        var sessions = CreateSessions();
        var gameId = Guid.NewGuid();
        sessions.Join(gameId, UserA, "conn-1", FixedStart);

        var change = sessions.Join(gameId, UserB, "conn-2", FixedStart.AddSeconds(1));

        Assert.True(change.MemberPresenceChanged);
        Assert.Equal(1, sessions.Count);
        Assert.Equal(FixedStart, change.Session!.StartedAt);
        Assert.Equal(2, change.Session.Connections.Count);
    }

    [Fact]
    public void Join_SameMemberSecondConnection_DoesNotReportPresenceChange()
    {
        var sessions = CreateSessions();
        var gameId = Guid.NewGuid();
        sessions.Join(gameId, UserA, "conn-1", FixedStart);

        var change = sessions.Join(gameId, UserA, "conn-2", FixedStart);

        Assert.False(change.MemberPresenceChanged);
        Assert.Equal(1, sessions.Count);
        Assert.Single(change.Session!.Connections);
    }

    [Fact]
    public void Join_ConcurrentFromTwoMembers_ProducesOneSessionHoldingBoth()
    {
        for (var round = 0; round < 50; round++)
        {
            var sessions = CreateSessions();
            var gameId = Guid.NewGuid();

            RunConcurrently(
                () => sessions.Join(gameId, UserA, "conn-a", FixedStart),
                () => sessions.Join(gameId, UserB, "conn-b", FixedStart));

            Assert.Equal(1, sessions.Count);
            var session = sessions.Find(gameId);
            Assert.NotNull(session);
            Assert.Equal(2, session!.Connections.Count);
        }
    }

    [Fact]
    public void Leave_ArrivalRacesDrop_DoesNotOrphanArrival()
    {
        for (var round = 0; round < 50; round++)
        {
            var sessions = CreateSessions();
            var gameId = Guid.NewGuid();
            sessions.Join(gameId, UserA, "conn-a", FixedStart);

            RunConcurrently(
                () => sessions.Leave(gameId, UserA, "conn-a", FixedStart.AddMinutes(1)),
                () => sessions.Join(gameId, UserB, "conn-b", FixedStart));

            var session = sessions.Find(gameId);
            Assert.NotNull(session);
            Assert.Contains(UserB, session!.Connections.Keys);
        }
    }

    [Fact]
    public void Leave_LastConnection_DropsSession()
    {
        var sessions = CreateSessions();
        var gameId = Guid.NewGuid();
        sessions.Join(gameId, UserA, "conn-1", FixedStart);

        var change = sessions.Leave(gameId, UserA, "conn-1", FixedStart.AddMinutes(5));

        Assert.Null(change.Session);
        Assert.True(change.MemberPresenceChanged);
        Assert.Equal(0, sessions.Count);
        Assert.Null(sessions.Find(gameId));
    }

    [Fact]
    public void Join_AfterSessionDropped_StartsFreshSessionWithNewStartedAt()
    {
        var sessions = CreateSessions();
        var gameId = Guid.NewGuid();
        sessions.Join(gameId, UserA, "conn-1", FixedStart);
        sessions.Leave(gameId, UserA, "conn-1", FixedStart.AddMinutes(5));

        var change = sessions.Join(gameId, UserB, "conn-2", FixedStart.AddMinutes(10));

        Assert.Equal(FixedStart.AddMinutes(10), change.Session!.StartedAt);
    }

    [Fact]
    public void Find_FreshRegistry_ReportsNoSessions()
    {
        var sessions = CreateSessions();

        Assert.Equal(0, sessions.Count);
        Assert.Null(sessions.Find(Guid.NewGuid()));
    }

    [Fact]
    public void Join_SessionStartsAndEnds_ActiveGaugeTracksBoth()
    {
        var (sessions, meterFactory) = CreateInstrumentedSessions();
        using var gauge = CreateCollector<int>(meterFactory, "ahlcg.game_sessions.active");
        var gameId = Guid.NewGuid();

        sessions.Join(gameId, UserA, "conn-1", FixedStart);
        gauge.RecordObservableInstruments();
        Assert.Equal(1, gauge.LastMeasurement!.Value);

        sessions.Leave(gameId, UserA, "conn-1", FixedStart.AddMinutes(1));
        gauge.RecordObservableInstruments();
        Assert.Equal(0, gauge.LastMeasurement!.Value);
    }

    [Fact]
    public void Leave_SessionEndsAfterMembersComeAndGo_RecordsPeakNotFinalMemberCount()
    {
        var (sessions, meterFactory) = CreateInstrumentedSessions();
        using var players = CreateCollector<int>(meterFactory, "ahlcg.game_sessions.players");
        var gameId = Guid.NewGuid();
        sessions.Join(gameId, UserA, "conn-a", FixedStart);
        sessions.Join(gameId, UserB, "conn-b", FixedStart);
        sessions.Join(gameId, UserC, "conn-c", FixedStart);
        sessions.Leave(gameId, UserA, "conn-a", FixedStart.AddMinutes(1));
        sessions.Leave(gameId, UserB, "conn-b", FixedStart.AddMinutes(2));

        sessions.Leave(gameId, UserC, "conn-c", FixedStart.AddMinutes(3));

        var measurement = Assert.Single(players.GetMeasurementSnapshot());
        Assert.Equal(3, measurement.Value);
    }

    [Fact]
    public void Leave_SessionEnds_RecordsDurationSinceStartedAt()
    {
        var (sessions, meterFactory) = CreateInstrumentedSessions();
        using var duration = CreateCollector<double>(meterFactory, "ahlcg.game_sessions.duration");
        var gameId = Guid.NewGuid();
        sessions.Join(gameId, UserA, "conn-a", FixedStart);

        sessions.Leave(gameId, UserA, "conn-a", FixedStart.AddSeconds(90));

        var measurement = Assert.Single(duration.GetMeasurementSnapshot());
        Assert.Equal(90, measurement.Value);
    }

    [Fact]
    public void Leave_ConcurrentEndings_RecordsExactlyOneMeasurementPerSession()
    {
        var (sessions, meterFactory) = CreateInstrumentedSessions();
        using var duration = CreateCollector<double>(meterFactory, "ahlcg.game_sessions.duration");
        var gameIds = Enumerable.Range(0, 20).Select(_ => Guid.NewGuid()).ToArray();
        foreach (var gameId in gameIds)
        {
            sessions.Join(gameId, UserA, "conn-a", FixedStart);
            sessions.Join(gameId, UserB, "conn-b", FixedStart);
        }

        RunConcurrently(gameIds
            .SelectMany(gameId => new Action[]
            {
                () => sessions.Leave(gameId, UserA, "conn-a", FixedStart.AddMinutes(1)),
                () => sessions.Leave(gameId, UserB, "conn-b", FixedStart.AddMinutes(1))
            })
            .ToArray());

        Assert.Equal(gameIds.Length, duration.GetMeasurementSnapshot().Count);
    }

    private static void RunConcurrently(params Action[] actions)
    {
        var barrier = new Barrier(actions.Length);
        var threads = actions
            .Select(action => new Thread(() =>
            {
                barrier.SignalAndWait();
                action();
            }))
            .ToArray();

        foreach (var thread in threads) thread.Start();
        foreach (var thread in threads) thread.Join();
    }

    private static MetricCollector<T> CreateCollector<T>(IMeterFactory meterFactory, string instrumentName)
        where T : struct =>
        new(meterFactory, GameSessions.MeterName, instrumentName, TimeProvider.System);

    private static GameSessions CreateSessions() => CreateInstrumentedSessions().Sessions;

    private static (GameSessions Sessions, IMeterFactory MeterFactory) CreateInstrumentedSessions()
    {
        var meterFactory = new ServiceCollection()
            .AddMetrics()
            .BuildServiceProvider()
            .GetRequiredService<IMeterFactory>();
        return (new GameSessions(meterFactory), meterFactory);
    }

    private const string UserA = "4139F1EA-4901-4253-A391-021FAA001677";
    private const string UserB = "B6E3B6BF-EFFF-4B94-9E13-2E27FFF3C7CE";
    private const string UserC = "0B1E9A3E-2E92-4B3F-9C0E-6E1B2E9A0F11";

    private static readonly DateTimeOffset FixedStart = new(2026, 1, 1, 0, 0, 0, TimeSpan.Zero);
}
