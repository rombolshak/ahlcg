using System.Data;
using System.Globalization;
using System.Text.Json;
using System.Text.Json.Nodes;
using Json.Patch;
using Microsoft.EntityFrameworkCore;
using Npgsql;
using Tablier.Contract;
using Tablier.Data;
using Tablier.Engine.History.Live;

namespace Tablier.Engine.History;

#pragma warning disable MA0048
public sealed record StoredState<TState>(int Version, TState State);

public readonly record struct PlayerChoice(string Member, string Action);
#pragma warning restore MA0048

public sealed partial class GameHistory<TState>(ApplicationDbContext db, ILogger<GameHistory<TState>> logger)
    : IGameHistory<TState>
    where TState : ISchemaVersioned
{
    public async Task<StoredState<TState>?> Begin(Guid gameId, TState initial, CancellationToken ct)
    {
        var begun = await db
            .Database.CreateExecutionStrategy()
            .ExecuteAsync(async () =>
            {
                db.ChangeTracker.Clear();
                if (await FindHead(gameId, ct) is not null)
                {
                    LogBeginRefusedAlreadyBegun(logger, gameId);
                    return false;
                }

                db.GameSnapshots.Add(CreateSnapshot(gameId, 0, initial));
                if (await TrySave(ct))
                    return true;

                LogBeginRefusedAlreadyBegun(logger, gameId);
                return false;
            });
        if (!begun)
            return null;

        LogHistoryBegun(logger, gameId);
        return new StoredState<TState>(0, initial);
    }

    public async Task<StoredState<TState>?> Append(
        Guid gameId,
        StoredState<TState> previous,
        StepResult<TState> result,
        PlayerChoice? choice,
        CancellationToken ct
    )
    {
        var version = previous.Version + 1;
        if (result.Checkpoints.Contains("undo", StringComparer.Ordinal))
        {
            LogAppendRefusedReservedCheckpoint(logger, gameId, previous.Version);
            return null;
        }

        var writesSnapshot = result.Checkpoints.Count > 0 || result.IsBaseline || result.IsIrreversible;
        var appended = await db
            .Database.CreateExecutionStrategy()
            .ExecuteAsync(async () =>
            {
                db.ChangeTracker.Clear();
                var head = await FindHead(gameId, ct);
                if (head is null)
                {
                    LogAppendRefusedNotBegun(logger, gameId, previous.Version);
                    return false;
                }

                if (head != previous.Version)
                {
                    LogAppendRefusedStale(logger, gameId, previous.Version, head.Value);
                    return false;
                }

                var patch = SerializeToJson(previous.State).CreatePatch(SerializeToJson(result.State));
                db.GameSteps.Add(
                    new GameStep
                    {
                        GameId = gameId,
                        Version = version,
                        Actor = choice?.Member,
                        Action = choice?.Action,
                        Patch = JsonSerializer.SerializeToDocument(patch),
                        Checkpoints = result.Checkpoints.ToArray(),
                        IsIrreversible = result.IsIrreversible,
                        IsBaseline = result.IsBaseline,
                    }
                );
                if (writesSnapshot)
                    db.GameSnapshots.Add(CreateSnapshot(gameId, version, result.State));

                if (await TrySave(ct))
                    return true;

                LogAppendRefusedConcurrent(logger, gameId, previous.Version);
                return false;
            });
        if (!appended)
            return null;

        LogStepAppended(logger, gameId, version);
        if (writesSnapshot)
        {
            LogSnapshotWritten(logger, gameId, version);
        }

        return new StoredState<TState>(version, result.State);
    }

    public async Task<StoredState<TState>?> LoadCurrent(Guid gameId, CancellationToken ct)
    {
        var history = await db
            .Database.CreateExecutionStrategy()
            .ExecuteAsync(async () =>
            {
                await using var transaction = await db.Database.BeginTransactionAsync(
                    IsolationLevel.RepeatableRead,
                    ct
                );
                var snapshot = await db
                    .GameSnapshots.AsNoTracking()
                    .Where(s => s.GameId == gameId)
                    .OrderByDescending(s => s.Version)
                    .FirstOrDefaultAsync(ct);
                if (snapshot is null)
                    return null;

                var steps = await db
                    .GameSteps.AsNoTracking()
                    .Where(s => s.GameId == gameId && s.Version > snapshot.Version)
                    .OrderBy(s => s.Version)
                    .ToListAsync(ct);
                return new LoadedHistory(snapshot, steps);
            });

        if (history is null)
        {
            LogLoadRefusedNotBegun(logger, gameId);
            return null;
        }

        return Reconstruct(gameId, history);
    }

    public async Task<StoredState<TState>?> LoadAt(Guid gameId, int version, CancellationToken ct)
    {
        var historyRead = await db
            .Database.CreateExecutionStrategy()
            .ExecuteAsync(async () =>
            {
                await using var transaction = await db.Database.BeginTransactionAsync(
                    IsolationLevel.RepeatableRead,
                    ct
                );
                return await ReadHistoryAt(gameId, version, ct);
            });
        if (historyRead.Barrier is not null)
        {
            LogLoadAtRefusedBehindBarrier(logger, gameId, version, historyRead.Barrier.Value);
            return null;
        }

        if (historyRead.History is null)
        {
            switch (historyRead.Refusal)
            {
                case LoadRefusal.InvalidVersion:
                    LogLoadAtRefusedInvalidVersion(logger, gameId, version);
                    break;
                case LoadRefusal.NoSnapshot:
                    LogLoadAtRefusedNoSnapshot(logger, gameId, version);
                    break;
                case LoadRefusal.Gap:
                    LogLoadAtRefusedGap(logger, gameId, version);
                    break;
            }
            return null;
        }

        var storedState = Reconstruct(gameId, historyRead.History);
        LogStateLoadedAt(logger, gameId, version);
        return storedState;
    }

    public async Task<StoredState<TState>?> Rewind(
        Guid gameId,
        int expectedVersion,
        int targetVersion,
        CancellationToken ct = default
    )
    {
        var result = await db
            .Database.CreateExecutionStrategy()
            .ExecuteAsync(async () =>
            {
                db.ChangeTracker.Clear();
                await using var transaction = await db.Database.BeginTransactionAsync(
                    IsolationLevel.RepeatableRead,
                    ct
                );
                var refusal = await CheckRewind(gameId, expectedVersion, targetVersion, ct);
                if (refusal is not null)
                    return (State: (StoredState<TState>?)null, Refusal: refusal);

                var restored = await WriteRewind(gameId, expectedVersion, targetVersion, ct);
                if (restored is null)
                    return (State: (StoredState<TState>?)null, Refusal: (string?)"physical_history");

                if (!await TrySave(ct))
                    return (State: (StoredState<TState>?)null, Refusal: (string?)"concurrent_write");

                await transaction.CommitAsync(ct);
                return (State: (StoredState<TState>?)restored, Refusal: (string?)null);
            });
        if (result.State is null)
            LogRewindRefused(logger, gameId, expectedVersion, targetVersion, result.Refusal!);
        else
            LogHistoryRewound(logger, gameId, result.State.Version, targetVersion);

        return result.State;
    }

    public async Task<HistorySummary?> GetHistorySummary(Guid gameId, int version, CancellationToken ct = default)
    {
        var facts = await ReadLiveFacts(gameId, version, lower: version, ct);
        var summary = LiveHistory.GetSummary(version, facts);
        LogSummaryRead(logger, gameId, version, summary is null ? "invalid_history" : "loaded");
        return summary;
    }

    public async Task<IReadOnlySet<string>?> GetActorsForRange(
        Guid gameId,
        int lowerExclusiveVersion,
        int upperInclusiveVersion,
        CancellationToken ct = default
    )
    {
        var actors = await db
            .Database.CreateExecutionStrategy()
            .ExecuteAsync(async () =>
            {
                await using var transaction = await db.Database.BeginTransactionAsync(
                    IsolationLevel.RepeatableRead,
                    ct
                );
                if (lowerExclusiveVersion < 0 || lowerExclusiveVersion > upperInclusiveVersion)
                    return null;

                var facts = await LiveHistory.Read(
                    db,
                    gameId,
                    head: upperInclusiveVersion,
                    lower: lowerExclusiveVersion,
                    target: -1,
                    ct
                );
                if (LiveHistory.GetSummary(upperInclusiveVersion, facts) is null)
                    return null;

                return facts
                    .Where(fact => string.Equals(fact.Kind, "actor", StringComparison.Ordinal))
                    .Select(fact => fact.Actor!)
                    .ToHashSet();
            });
        LogActorsRead(
            logger,
            gameId,
            lowerExclusiveVersion,
            upperInclusiveVersion,
            actors is null ? "invalid_history" : "loaded"
        );
        return actors;
    }

    private async Task<List<LiveFact>> ReadLiveFacts(
        Guid gameId,
        int version,
        int lower,
        CancellationToken ct = default
    ) =>
        await db
            .Database.CreateExecutionStrategy()
            .ExecuteAsync(async () =>
            {
                await using var transaction = await db.Database.BeginTransactionAsync(
                    IsolationLevel.RepeatableRead,
                    ct
                );
                return await LiveHistory.Read(db, gameId, head: version, lower, target: -1, ct);
            });

    private async Task<string?> CheckRewind(
        Guid gameId,
        int expectedVersion,
        int targetVersion,
        CancellationToken ct = default
    )
    {
        if (targetVersion <= 0 || targetVersion >= expectedVersion || expectedVersion == int.MaxValue)
            return "invalid_target";

        if (await FindHead(gameId, ct) != expectedVersion)
            return "stale_head";

        var facts = await LiveHistory.Read(
            db,
            gameId,
            head: expectedVersion,
            lower: expectedVersion,
            target: targetVersion,
            ct
        );
        if (LiveHistory.GetSummary(expectedVersion, facts) is null)
            return "invalid_history";

        return facts.Exists(fact => string.Equals(fact.Kind, "target", StringComparison.Ordinal))
            ? null
            : "target_not_live";
    }

    private async Task<StoredState<TState>?> WriteRewind(
        Guid gameId,
        int expectedVersion,
        int targetVersion,
        CancellationToken ct = default
    )
    {
        var headRead = await ReadHistoryAt(gameId, expectedVersion, ct);
        var destinationRead = await ReadHistoryAt(gameId, targetVersion, ct);
        if (headRead.History is null || destinationRead.History is null)
            return null;

        var head = Reconstruct(gameId, headRead.History);
        var destination = Reconstruct(gameId, destinationRead.History);
        var step = await db
            .GameSteps.AsNoTracking()
            .SingleAsync(s => s.GameId == gameId && s.Version == targetVersion, ct);
        var version = expectedVersion + 1;
        db.GameSteps.Add(
            new GameStep
            {
                GameId = gameId,
                Version = version,
                RestoredVersion = step.RestoredVersion ?? step.Version,
                Actor = step.Actor,
                Action = step.Action,
                Checkpoints = step.Checkpoints,
                IsBaseline = step.IsBaseline,
                IsIrreversible = step.IsIrreversible,
                Patch = JsonSerializer.SerializeToDocument(
                    SerializeToJson(head.State).CreatePatch(SerializeToJson(destination.State))
                ),
            }
        );
        if (step.Checkpoints.Length > 0 || step.IsBaseline || step.IsIrreversible)
            db.GameSnapshots.Add(CreateSnapshot(gameId, version, destination.State));

        return new StoredState<TState>(version, destination.State);
    }

    private async Task<HistoryRead> ReadHistoryAt(Guid gameId, int version, CancellationToken ct = default)
    {
        var barrier = await db
            .GameSteps.Where(s => s.GameId == gameId && (s.IsIrreversible || s.IsBaseline))
            .MaxAsync(s => (int?)s.Version, ct);
        if (barrier > version)
            return new HistoryRead(History: null, barrier, LoadRefusal.None);

        if (version < 0)
            return new HistoryRead(History: null, Barrier: null, LoadRefusal.InvalidVersion);

        var snapshot = await db
            .GameSnapshots.AsNoTracking()
            .Where(s => s.GameId == gameId && s.Version <= version)
            .OrderByDescending(s => s.Version)
            .FirstOrDefaultAsync(ct);
        if (snapshot is null)
            return new HistoryRead(History: null, Barrier: null, LoadRefusal.NoSnapshot);

        if (snapshot.Version == version)
            return new HistoryRead(new LoadedHistory(snapshot, []), Barrier: null, LoadRefusal.None);

        var steps = await db
            .GameSteps.AsNoTracking()
            .Where(s => s.GameId == gameId && s.Version > snapshot.Version && s.Version <= version)
            .OrderBy(s => s.Version)
            .ToListAsync(ct);
        if (steps.Count != version - snapshot.Version)
            return new HistoryRead(History: null, Barrier: null, LoadRefusal.Gap);

        return new HistoryRead(new LoadedHistory(snapshot, steps), Barrier: null, LoadRefusal.None);
    }

    private static StoredState<TState> Reconstruct(Guid gameId, LoadedHistory history)
    {
        if (history.Steps.Count == 0)
        {
            return new StoredState<TState>(history.Snapshot.Version, Deserialize(history.Snapshot.State));
        }

        var node = history.Snapshot.State.Deserialize<JsonNode>();
        foreach (var step in history.Steps)
        {
            var result = step.Patch.Deserialize<JsonPatch>()!.Apply(node);
            if (!result.IsSuccess)
            {
                throw new InvalidOperationException(
                    string.Create(
                        CultureInfo.InvariantCulture,
                        $"Step {step.Version} of game {gameId} does not apply to the state before it: {result.Error}"
                    )
                );
            }

            node = result.Result;
        }

        return new StoredState<TState>(history.Steps[^1].Version, Deserialize(node));
    }

    private async Task<bool> TrySave(CancellationToken ct)
    {
        try
        {
            await db.SaveChangesAsync(ct);
            return true;
        }
        catch (DbUpdateException e) when (IsUniqueViolation(e))
        {
            return false;
        }
        finally
        {
            db.ChangeTracker.Clear();
        }
    }

    private static bool IsUniqueViolation(DbUpdateException e) =>
        e.InnerException is PostgresException { SqlState: PostgresErrorCodes.UniqueViolation };

    private async Task<int?> FindHead(Guid gameId, CancellationToken ct) =>
        await db.GameSteps.Where(s => s.GameId == gameId).MaxAsync(s => (int?)s.Version, ct)
        ?? await db.GameSnapshots.Where(s => s.GameId == gameId).MaxAsync(s => (int?)s.Version, ct);

    private static GameSnapshot CreateSnapshot(Guid gameId, int version, TState state) =>
        new()
        {
            GameId = gameId,
            Version = version,
            State = JsonSerializer.SerializeToDocument(state),
            SchemaVersion = state.SchemaVersion,
        };

    private static JsonNode SerializeToJson(TState state) =>
        JsonSerializer.SerializeToNode(state) ?? throw new InvalidOperationException("A state cannot be null.");

    private static TState Deserialize(JsonDocument document) =>
        document.Deserialize<TState>() ?? throw new InvalidOperationException("A stored state cannot be null.");

    private static TState Deserialize(JsonNode? node) =>
        node.Deserialize<TState>() ?? throw new InvalidOperationException("A stored state cannot be null.");

    private sealed record LoadedHistory(GameSnapshot Snapshot, List<GameStep> Steps);

    private sealed record HistoryRead(LoadedHistory? History, int? Barrier, LoadRefusal Refusal);

    private enum LoadRefusal
    {
        None,
        InvalidVersion,
        NoSnapshot,
        Gap,
    }

    [LoggerMessage(LogLevel.Information, "History of game {GameId} begun")]
    private static partial void LogHistoryBegun(ILogger logger, Guid gameId);

    [LoggerMessage(LogLevel.Warning, "Begin refused for game {GameId}: it already has history")]
    private static partial void LogBeginRefusedAlreadyBegun(ILogger logger, Guid gameId);

    [LoggerMessage(LogLevel.Debug, "Step {Version} appended to game {GameId}")]
    private static partial void LogStepAppended(ILogger logger, Guid gameId, int version);

    [LoggerMessage(LogLevel.Debug, "Snapshot written at version {Version} of game {GameId}")]
    private static partial void LogSnapshotWritten(ILogger logger, Guid gameId, int version);

    [LoggerMessage(LogLevel.Warning, "Append refused for game {GameId}: it has not begun (previous version {Version})")]
    private static partial void LogAppendRefusedNotBegun(ILogger logger, Guid gameId, int version);

    [LoggerMessage(
        LogLevel.Warning,
        "Append refused for game {GameId}: previous version {Version} is not the head {Head}"
    )]
    private static partial void LogAppendRefusedStale(ILogger logger, Guid gameId, int version, int head);

    [LoggerMessage(
        LogLevel.Warning,
        "Append refused for game {GameId}: a concurrent append took the step after previous version {Version}"
    )]
    private static partial void LogAppendRefusedConcurrent(ILogger logger, Guid gameId, int version);

    [LoggerMessage(LogLevel.Warning, "Load refused for game {GameId}: it has not begun")]
    private static partial void LogLoadRefusedNotBegun(ILogger logger, Guid gameId);

    [LoggerMessage(
        LogLevel.Warning,
        "Load refused for game {GameId}: version {Version} is behind the irreversible or baseline step {Barrier}"
    )]
    private static partial void LogLoadAtRefusedBehindBarrier(ILogger logger, Guid gameId, int version, int barrier);

    [LoggerMessage(LogLevel.Warning, "Load refused for game {GameId}: no snapshot at or before version {Version}")]
    private static partial void LogLoadAtRefusedNoSnapshot(ILogger logger, Guid gameId, int version);

    [LoggerMessage(LogLevel.Information, "Append refused for game {GameId} at version {Version}: reserved checkpoint")]
    private static partial void LogAppendRefusedReservedCheckpoint(ILogger logger, Guid gameId, int version);

    [LoggerMessage(LogLevel.Information, "Load refused for game {GameId}: version {Version} is outside history")]
    private static partial void LogLoadAtRefusedInvalidVersion(ILogger logger, Guid gameId, int version);

    [LoggerMessage(LogLevel.Warning, "Load refused for game {GameId}: patch chain to version {Version} has a gap")]
    private static partial void LogLoadAtRefusedGap(ILogger logger, Guid gameId, int version);

    [LoggerMessage(LogLevel.Debug, "State loaded at version {Version} of game {GameId}")]
    private static partial void LogStateLoadedAt(ILogger logger, Guid gameId, int version);

    [LoggerMessage(LogLevel.Information, "Game {GameId} rewound at version {Version} to version {TargetVersion}")]
    private static partial void LogHistoryRewound(ILogger logger, Guid gameId, int version, int targetVersion);

    [LoggerMessage(
        LogLevel.Information,
        "Rewind refused for game {GameId} at version {Version} to {TargetVersion}: {Reason}"
    )]
    private static partial void LogRewindRefused(
        ILogger logger,
        Guid gameId,
        int version,
        int targetVersion,
        string reason
    );

    [LoggerMessage(LogLevel.Debug, "Summary for game {GameId} at version {Version}: {Reason}")]
    private static partial void LogSummaryRead(ILogger logger, Guid gameId, int version, string reason);

    [LoggerMessage(LogLevel.Debug, "Actors for game {GameId} after {LowerVersion} through {UpperVersion}: {Reason}")]
    private static partial void LogActorsRead(
        ILogger logger,
        Guid gameId,
        int lowerVersion,
        int upperVersion,
        string reason
    );
}
