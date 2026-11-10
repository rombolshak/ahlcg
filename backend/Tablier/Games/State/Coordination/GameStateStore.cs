using System.Data;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using Tablier.Contract;
using Tablier.Data;
using Tablier.Engine.History;
using Tablier.Engine.History.Rewind;
using Tablier.Games.Sessions;
using Tablier.Games.State.Cache;
using Tablier.Games.State.Models;
using Tablier.Telemetry;

namespace Tablier.Games.State.Coordination;

public sealed partial class GameStateStore<TState>(
    IGameStateCache<TState> cache,
    IGameHistory<TState> history,
    IRewindQueries rewind,
    ApplicationDbContext db,
    GameSessions sessions,
    IHubContext<GameHub, IGameClient> hub,
    TablierMetrics metrics,
    TimeProvider time,
    ILogger<GameStateStore<TState>> logger
) : IGameStateStore<TState>
    where TState : ISchemaVersioned
{
    public async Task<GameState<TState>?> Load(GameMutationLease lease, CancellationToken ct = default)
    {
        var cached = await cache.Load(lease.GameId, ct);
        if (lease.IsActivated && !lease.IsDirty && cached is not null)
            return cached;

        var reason =
            lease.IsDirty ? "dirty_after_commit"
            : cached is null ? "missing"
            : "process_activation";
        var started = time.GetTimestamp();
        var outcome = "error";
        try
        {
            var rebuilt = await ReadAuthoritative(lease.GameId, ct);
            if (rebuilt is null)
                return null;
            if (cached is not null && cached.Engine.GameVersion == rebuilt.Engine.GameVersion)
                rebuilt = rebuilt with { Engine = CarryTransientState(cached.Engine, rebuilt.Engine) };
            if (!await cache.Write(lease.GameId, cached, rebuilt, ct))
                throw new InvalidOperationException("Envelope recovery lost its expected generation.");
            lease.IsActivated = true;
            lease.IsDirty = false;
            LogRebuilt(logger, lease.GameId, rebuilt.SyncId, rebuilt.Engine.GameVersion, reason);
            await PublishReset(lease.GameId, rebuilt.SyncId);
            outcome = "ok";
            return rebuilt;
        }
        catch
        {
            lease.IsDirty = true;
            throw;
        }
        finally
        {
            metrics.RebuildDuration.Record(
                time.GetElapsedTime(started).TotalSeconds,
                new KeyValuePair<string, object?>("reason", reason),
                new KeyValuePair<string, object?>("outcome", outcome)
            );
        }
    }

    public async Task<bool> Install(
        GameMutationLease lease,
        GameState<TState> previous,
        GameState<TState> replacement,
        CancellationToken ct = default
    )
    {
        try
        {
            if (await cache.Write(lease.GameId, previous, replacement, ct))
            {
                lease.IsDirty = false;
                return true;
            }
        }
        catch (Exception exception)
        {
            LogCacheFailed(logger, lease.GameId, replacement.Engine.GameVersion, exception);
        }
        lease.IsDirty = true;
        LogDirty(logger, lease.GameId, replacement.Engine.GameVersion);
        return false;
    }

    public async Task<EngineState> ReadEngine(
        Guid gameId,
        int gameVersion,
        RewindMetadata metadata,
        CancellationToken ct = default
    )
    {
        var game = await db
            .Games.AsNoTracking()
            .Where(g => g.Id == gameId)
            .Select(g => new { g.IntendedPlayersCount, Members = g.Members.Select(m => m.UserId).ToArray() })
            .SingleAsync(ct);
        var session = sessions.SyncInviteCode(gameId, game.Members.Length, game.IntendedPlayersCount);
        var members = game.Members.ToDictionary(
            member => member,
            member => session?.Connections.ContainsKey(member) ?? false,
            StringComparer.Ordinal
        );
        return new EngineState(gameVersion, members, MemberId: null, session?.InviteCode, metadata);
    }

    private static EngineState CarryTransientState(EngineState cached, EngineState rebuilt)
    {
        var proposal = cached.Proposal?.SourceGameVersion == rebuilt.GameVersion ? cached.Proposal : null;
        return rebuilt with { Proposal = proposal, Outcome = cached.Outcome };
    }

    private async Task<GameState<TState>?> ReadAuthoritative(Guid gameId, CancellationToken ct = default)
    {
        return await db
            .Database.CreateExecutionStrategy()
            .ExecuteAsync(async () =>
            {
                await using var transaction = await db.Database.BeginTransactionAsync(
                    IsolationLevel.RepeatableRead,
                    ct
                );
                var stored = await history.LoadCurrent(gameId, ct);
                if (stored is null)
                    return null;
                var metadata = await rewind.Load(gameId, stored.Version, ct);
                var engine = await ReadEngine(gameId, stored.Version, metadata, ct);
                return new GameState<TState>(Guid.CreateVersion7(), 0, engine, stored.State);
            });
    }

    private async Task PublishReset(Guid gameId, Guid syncId)
    {
        var started = time.GetTimestamp();
        var outcome = "error";
        try
        {
            await hub.Clients.Group(gameId.ToString()).StateChanged(new ResetRequired(syncId));
            outcome = "ok";
        }
        catch (Exception exception)
        {
            LogDeliveryFailed(logger, gameId, exception);
        }
        finally
        {
            metrics.PublicationDuration.Record(
                time.GetElapsedTime(started).TotalSeconds,
                new KeyValuePair<string, object?>("kind", "reset_required"),
                new KeyValuePair<string, object?>("outcome", outcome)
            );
        }
    }

    [LoggerMessage(
        LogLevel.Information,
        "Envelope for game {GameId} rebuilt as {SyncId} at game version {Version}: {Reason}"
    )]
    private static partial void LogRebuilt(ILogger logger, Guid gameId, Guid syncId, int version, string reason);

    [LoggerMessage(LogLevel.Warning, "Envelope for game {GameId} is dirty after game version {Version}")]
    private static partial void LogDirty(ILogger logger, Guid gameId, int version);

    [LoggerMessage(LogLevel.Error, "Cache write for game {GameId} failed after game version {Version}")]
    private static partial void LogCacheFailed(ILogger logger, Guid gameId, int version, Exception exception);

    [LoggerMessage(LogLevel.Error, "Reset dispatch for game {GameId} failed")]
    private static partial void LogDeliveryFailed(ILogger logger, Guid gameId, Exception exception);
}
