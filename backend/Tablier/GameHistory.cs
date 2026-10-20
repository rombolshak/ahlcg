using System.Data;
using System.Text.Json;
using System.Text.Json.Nodes;
using Json.Patch;
using Microsoft.EntityFrameworkCore;
using Npgsql;
using Tablier.Contract;
using Tablier.Data;

namespace Tablier;

public sealed record StoredState<TState>(int Version, TState State);

public readonly record struct PlayerChoice(string Member, string Action);

public sealed partial class GameHistory<TState>(ApplicationDbContext db, ILogger<GameHistory<TState>> logger)
    where TState : ISchemaVersioned
{
    public async Task<StoredState<TState>?> Begin(Guid gameId, TState initial, CancellationToken ct)
    {
        RequireNoPendingChanges();
        bool begun;
        try
        {
            begun = await InTransaction(async () =>
            {
                if (await Head(gameId, ct) is not null) return false;

                db.GameSnapshots.Add(NewSnapshot(gameId, 0, initial));
                await db.SaveChangesAsync(ct);
                return true;
            }, ct);
        }
        catch (DbUpdateException e) when (IsUniqueViolation(e))
        {
            begun = false;
        }

        if (!begun)
        {
            LogBeginRefusedAlreadyBegun(logger, gameId);
            return null;
        }

        LogHistoryBegun(logger, gameId);
        return new StoredState<TState>(0, initial);
    }

    public async Task<StoredState<TState>?> Append(
        Guid gameId,
        StoredState<TState> previous,
        StepResult<TState> step,
        PlayerChoice? choice,
        CancellationToken ct)
    {
        RequireNoPendingChanges();
        var patch = ToNode(previous.State).CreatePatch(ToNode(step.State));

        AppendOutcome outcome;
        try
        {
            outcome = await InTransaction(async () =>
            {
                if (await Head(gameId, ct) is not { } head) return new AppendOutcome(AppendStatus.NotBegun, 0, default);
                if (head != previous.Version) return new AppendOutcome(AppendStatus.Stale, head, default);

                var version = head + 1;
                db.GameSteps.Add(new GameStep
                {
                    GameId = gameId,
                    Version = version,
                    Actor = choice?.Member,
                    Action = choice?.Action,
                    Patch = JsonSerializer.SerializeToDocument(patch),
                    Checkpoint = step.Checkpoint,
                    Irreversible = step.Irreversible,
                    Baseline = step.Baseline,
                });
                if (step.Checkpoint is not null || step.Baseline)
                {
                    db.GameSnapshots.Add(NewSnapshot(gameId, version, step.State));
                }

                await db.SaveChangesAsync(ct);

                var deleted = default(Deleted);
                if (step.Baseline)
                {
                    deleted = new Deleted(
                        await db.GameSteps.Where(s => s.GameId == gameId && s.Version < version).ExecuteDeleteAsync(ct),
                        await db.GameSnapshots.Where(s => s.GameId == gameId && s.Version < version).ExecuteDeleteAsync(ct));
                }
                else if (step.Irreversible)
                {
                    var floor = await db.GameSnapshots.Where(s => s.GameId == gameId).MinAsync(s => s.Version, ct);
                    deleted = new Deleted(
                        0,
                        await db.GameSnapshots
                            .Where(s => s.GameId == gameId && s.Version > floor && s.Version < version)
                            .ExecuteDeleteAsync(ct));
                }

                return new AppendOutcome(AppendStatus.Appended, head, deleted);
            }, ct);
        }
        catch (DbUpdateException e) when (IsUniqueViolation(e))
        {
            LogAppendRefusedConcurrent(logger, gameId, previous.Version);
            return null;
        }

        switch (outcome.Status)
        {
            case AppendStatus.NotBegun:
                LogAppendRefusedNotBegun(logger, gameId, previous.Version);
                return null;
            case AppendStatus.Stale:
                LogAppendRefusedStale(logger, gameId, previous.Version, outcome.Head);
                return null;
        }

        var appended = outcome.Head + 1;
        LogStepAppended(logger, gameId, appended);
        if (step.Checkpoint is not null) LogCheckpointSnapshotWritten(logger, gameId, appended);
        if (step.Baseline)
        {
            LogHistoryRebased(logger, gameId, appended, outcome.Deleted.Steps, outcome.Deleted.Snapshots);
        }
        else if (outcome.Deleted.Snapshots > 0)
        {
            LogUnreachableSnapshotsDeleted(logger, gameId, appended, outcome.Deleted.Snapshots);
        }

        return new StoredState<TState>(appended, step.State);
    }

    public async Task<StoredState<TState>?> LoadCurrent(Guid gameId, CancellationToken ct)
    {
        var history = await InTransaction<LoadedHistory?>(async () =>
        {
            var snapshot = await db.GameSnapshots.AsNoTracking()
                .Where(s => s.GameId == gameId)
                .OrderByDescending(s => s.Version)
                .FirstOrDefaultAsync(ct);
            if (snapshot is null) return null;

            var steps = await db.GameSteps.AsNoTracking()
                .Where(s => s.GameId == gameId && s.Version > snapshot.Version)
                .OrderBy(s => s.Version)
                .ToListAsync(ct);
            return new LoadedHistory(snapshot, steps);
        }, ct, IsolationLevel.RepeatableRead);

        if (history is null)
        {
            LogLoadRefusedNotBegun(logger, gameId);
            return null;
        }

        var node = history.Snapshot.State.RootElement.Deserialize<JsonNode>();
        foreach (var step in history.Steps)
        {
            var result = step.Patch.RootElement.Deserialize<JsonPatch>()!.Apply(node);
            if (!result.IsSuccess)
            {
                throw new InvalidOperationException(
                    $"Step {step.Version} of game {gameId} does not apply to the state before it: {result.Error}");
            }

            node = result.Result;
        }

        var version = history.Steps.Count > 0 ? history.Steps[^1].Version : history.Snapshot.Version;
        return new StoredState<TState>(version, ToState(node));
    }

    public async Task<StoredState<TState>?> LoadAt(Guid gameId, int version, CancellationToken ct)
    {
        var snapshot = await db.GameSnapshots.AsNoTracking()
            .SingleOrDefaultAsync(s => s.GameId == gameId && s.Version == version, ct);
        if (snapshot is null)
        {
            LogLoadAtRefusedNoSnapshot(logger, gameId, version);
            return null;
        }

        return new StoredState<TState>(version, ToState(snapshot.State.RootElement.Deserialize<JsonNode>()));
    }

    public async Task<bool> Truncate(Guid gameId, int version, CancellationToken ct)
    {
        RequireNoPendingChanges();
        var outcome = await InTransaction(async () =>
        {
            if (await db.GameSnapshots.Where(s => s.GameId == gameId).MinAsync(s => (int?)s.Version, ct) is not { } floor)
            {
                return new TruncateOutcome(TruncateStatus.NotBegun, 0, default);
            }

            if (version < floor) return new TruncateOutcome(TruncateStatus.BelowFloor, floor, default);

            var deleted = new Deleted(
                await db.GameSteps.Where(s => s.GameId == gameId && s.Version > version).ExecuteDeleteAsync(ct),
                await db.GameSnapshots.Where(s => s.GameId == gameId && s.Version > version).ExecuteDeleteAsync(ct));
            return new TruncateOutcome(TruncateStatus.Truncated, floor, deleted);
        }, ct);

        switch (outcome.Status)
        {
            case TruncateStatus.NotBegun:
                LogTruncateRefusedNotBegun(logger, gameId, version);
                return false;
            case TruncateStatus.BelowFloor:
                LogTruncateRefusedBelowFloor(logger, gameId, version, outcome.Floor);
                return false;
        }

        LogHistoryTruncated(logger, gameId, version, outcome.Deleted.Steps, outcome.Deleted.Snapshots);
        return true;
    }

    private Task<T> InTransaction<T>(
        Func<Task<T>> work, CancellationToken ct, IsolationLevel isolation = IsolationLevel.ReadCommitted) =>
        db.Database.CreateExecutionStrategy().ExecuteAsync(async () =>
        {
            var tracked = TrackedHistoryRows();
            try
            {
                await using var transaction = await db.Database.BeginTransactionAsync(isolation, ct);
                var result = await work();
                await transaction.CommitAsync(ct);
                return result;
            }
            finally
            {
                DetachHistoryRowsAddedSince(tracked);
            }
        });

    private void RequireNoPendingChanges()
    {
        if (db.ChangeTracker.HasChanges())
        {
            throw new InvalidOperationException(
                "The history store needs a DbContext with no pending changes: saving would write them too.");
        }
    }

    private HashSet<object> TrackedHistoryRows() =>
        db.ChangeTracker.Entries()
            .Select(e => e.Entity)
            .Where(e => e is GameStep or GameSnapshot)
            .ToHashSet(ReferenceEqualityComparer.Instance);

    private void DetachHistoryRowsAddedSince(HashSet<object> tracked)
    {
        var added = db.ChangeTracker.Entries()
            .Where(e => e.Entity is GameStep or GameSnapshot && !tracked.Contains(e.Entity))
            .ToList();
        foreach (var entry in added) entry.State = EntityState.Detached;
    }

    private static bool IsUniqueViolation(DbUpdateException e) =>
        e.InnerException is PostgresException { SqlState: PostgresErrorCodes.UniqueViolation };

    private async Task<int?> Head(Guid gameId, CancellationToken ct) =>
        await db.GameSteps.Where(s => s.GameId == gameId).MaxAsync(s => (int?)s.Version, ct)
        ?? await db.GameSnapshots.Where(s => s.GameId == gameId).MaxAsync(s => (int?)s.Version, ct);

    private static GameSnapshot NewSnapshot(Guid gameId, int version, TState state) => new()
    {
        GameId = gameId,
        Version = version,
        State = JsonSerializer.SerializeToDocument(state),
        SchemaVersion = state.SchemaVersion,
    };

    private static JsonNode ToNode(TState state) =>
        JsonSerializer.SerializeToNode(state) ?? throw new InvalidOperationException("A state cannot be null.");

    private static TState ToState(JsonNode? node) =>
        node.Deserialize<TState>() ?? throw new InvalidOperationException("A stored state cannot be null.");

    private sealed record LoadedHistory(GameSnapshot Snapshot, List<GameStep> Steps);

    private readonly record struct Deleted(int Steps, int Snapshots);

    private enum AppendStatus { Appended, NotBegun, Stale }

    private readonly record struct AppendOutcome(AppendStatus Status, int Head, Deleted Deleted);

    private enum TruncateStatus { Truncated, NotBegun, BelowFloor }

    private readonly record struct TruncateOutcome(TruncateStatus Status, int Floor, Deleted Deleted);

    [LoggerMessage(LogLevel.Information, "History of game {GameId} begun")]
    private static partial void LogHistoryBegun(ILogger logger, Guid gameId);

    [LoggerMessage(LogLevel.Warning, "Begin refused for game {GameId}: it already has history")]
    private static partial void LogBeginRefusedAlreadyBegun(ILogger logger, Guid gameId);

    [LoggerMessage(LogLevel.Debug, "Step {Version} appended to game {GameId}")]
    private static partial void LogStepAppended(ILogger logger, Guid gameId, int version);

    [LoggerMessage(LogLevel.Debug, "Checkpoint snapshot written at version {Version} of game {GameId}")]
    private static partial void LogCheckpointSnapshotWritten(ILogger logger, Guid gameId, int version);

    [LoggerMessage(LogLevel.Information,
        "History of game {GameId} rebased at version {Version}: {StepsDeleted} steps and {SnapshotsDeleted} snapshots deleted")]
    private static partial void LogHistoryRebased(
        ILogger logger, Guid gameId, int version, int stepsDeleted, int snapshotsDeleted);

    [LoggerMessage(LogLevel.Information,
        "Irreversible step {Version} of game {GameId} made {SnapshotsDeleted} snapshots unreachable; deleted")]
    private static partial void LogUnreachableSnapshotsDeleted(
        ILogger logger, Guid gameId, int version, int snapshotsDeleted);

    [LoggerMessage(LogLevel.Warning, "Append refused for game {GameId}: it has not begun (previous version {Version})")]
    private static partial void LogAppendRefusedNotBegun(ILogger logger, Guid gameId, int version);

    [LoggerMessage(LogLevel.Warning,
        "Append refused for game {GameId}: previous version {Version} is not the head {Head}")]
    private static partial void LogAppendRefusedStale(ILogger logger, Guid gameId, int version, int head);

    [LoggerMessage(LogLevel.Warning,
        "Append refused for game {GameId}: a concurrent append took the step after previous version {Version}")]
    private static partial void LogAppendRefusedConcurrent(ILogger logger, Guid gameId, int version);

    [LoggerMessage(LogLevel.Warning, "Load refused for game {GameId}: it has not begun")]
    private static partial void LogLoadRefusedNotBegun(ILogger logger, Guid gameId);

    [LoggerMessage(LogLevel.Warning, "Load refused for game {GameId}: no snapshot at version {Version}")]
    private static partial void LogLoadAtRefusedNoSnapshot(ILogger logger, Guid gameId, int version);

    [LoggerMessage(LogLevel.Information,
        "History of game {GameId} truncated to version {Version}: {StepsDeleted} steps and {SnapshotsDeleted} snapshots deleted")]
    private static partial void LogHistoryTruncated(
        ILogger logger, Guid gameId, int version, int stepsDeleted, int snapshotsDeleted);

    [LoggerMessage(LogLevel.Warning, "Truncate to version {Version} refused for game {GameId}: it has not begun")]
    private static partial void LogTruncateRefusedNotBegun(ILogger logger, Guid gameId, int version);

    [LoggerMessage(LogLevel.Warning,
        "Truncate to version {Version} refused for game {GameId}: below the floor {Floor}")]
    private static partial void LogTruncateRefusedBelowFloor(ILogger logger, Guid gameId, int version, int floor);
}
