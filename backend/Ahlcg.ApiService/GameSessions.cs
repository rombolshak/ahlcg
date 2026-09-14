using System.Collections.Concurrent;
using System.Collections.Immutable;
using System.Diagnostics.Metrics;

namespace Ahlcg.ApiService;

public sealed record GameSession(
    DateTimeOffset StartedAt,
    // ImmutableDictionary does not override Equals; GameSessions' CAS loop relies on this staying
    // reference-based. A structural comparer here would silently break TryUpdate/TryRemove.
    ImmutableDictionary<string, ImmutableHashSet<string>> Connections,
    int PeakMemberCount);

public readonly record struct SessionChange(GameSession? Session, bool MemberPresenceChanged);

public sealed class GameSessions
{
    public const string MeterName = "Ahlcg.ApiService.GameSessions";

    private readonly ConcurrentDictionary<Guid, GameSession> _sessions = new();
    private readonly Histogram<int> _playersHistogram;
    private readonly Histogram<double> _durationHistogram;

    public GameSessions(IMeterFactory meterFactory)
    {
        var meter = meterFactory.Create(MeterName);
        _playersHistogram = meter.CreateHistogram<int>("ahlcg.game_sessions.players", unit: "{player}");
        _durationHistogram = meter.CreateHistogram<double>("ahlcg.game_sessions.duration", unit: "s");
        meter.CreateObservableGauge("ahlcg.game_sessions.active", () => _sessions.Count, unit: "{session}");
    }

    public GameSession? Find(Guid gameId) => _sessions.GetValueOrDefault(gameId);

    public int Count => _sessions.Count;

    public SessionChange Join(Guid gameId, string userId, string connectionId, DateTimeOffset startedAt)
    {
        while (true)
        {
            if (_sessions.TryGetValue(gameId, out var observed))
            {
                var alreadyPresent = observed.Connections.TryGetValue(userId, out var existingConnections);
                var memberConnections = alreadyPresent
                    ? existingConnections!.Add(connectionId)
                    : ImmutableHashSet.Create(connectionId);
                var connections = observed.Connections.SetItem(userId, memberConnections);
                var next = observed with
                {
                    Connections = connections,
                    PeakMemberCount = Math.Max(observed.PeakMemberCount, connections.Count)
                };

                if (_sessions.TryUpdate(gameId, next, observed))
                    return new SessionChange(next, !alreadyPresent);
            }
            else
            {
                var connections = ImmutableDictionary<string, ImmutableHashSet<string>>.Empty
                    .Add(userId, ImmutableHashSet.Create(connectionId));
                var session = new GameSession(startedAt, connections, PeakMemberCount: 1);

                if (_sessions.TryAdd(gameId, session))
                    return new SessionChange(session, true);
            }
        }
    }

    public SessionChange Leave(Guid gameId, string userId, string connectionId, DateTimeOffset now)
    {
        while (true)
        {
            if (TryLeave(gameId, userId, connectionId, now, out var change)) return change;
        }
    }

    private bool TryLeave(
        Guid gameId, string userId, string connectionId, DateTimeOffset now, out SessionChange change)
    {
        change = default;

        if (!_sessions.TryGetValue(gameId, out var observed))
        {
            change = new SessionChange(null, false);
            return true;
        }

        if (!observed.Connections.TryGetValue(userId, out var memberConnections))
        {
            change = new SessionChange(observed, false);
            return true;
        }

        var remaining = memberConnections.Remove(connectionId);
        var memberLeft = remaining.Count == 0;
        var connections = memberLeft
            ? observed.Connections.Remove(userId)
            : observed.Connections.SetItem(userId, remaining);

        if (connections.Count == 0) return TryEndSession(gameId, observed, now, memberLeft, out change);

        var next = observed with { Connections = connections };
        if (!_sessions.TryUpdate(gameId, next, observed)) return false;

        change = new SessionChange(next, memberLeft);
        return true;
    }

    private bool TryEndSession(
        Guid gameId, GameSession observed, DateTimeOffset now, bool memberLeft, out SessionChange change)
    {
        change = default;
        if (!_sessions.TryRemove(KeyValuePair.Create(gameId, observed))) return false;

        _playersHistogram.Record(observed.PeakMemberCount);
        _durationHistogram.Record((now - observed.StartedAt).TotalSeconds);
        change = new SessionChange(null, memberLeft);
        return true;
    }
}
