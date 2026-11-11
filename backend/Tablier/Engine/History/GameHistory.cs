using System.Data;
using System.Globalization;
using System.Text.Json;
using System.Text.Json.Nodes;
using Json.Patch;
using Microsoft.EntityFrameworkCore;
using Npgsql;
using Tablier.Contract;
using Tablier.Data;

namespace Tablier.Engine.History;

#pragma warning disable MA0048
public sealed record StoredState<TState>(int Version, TState State);

public readonly record struct PlayerChoice(string Member, string Action);
#pragma warning restore MA0048

public sealed partial class GameHistory<TState>(ApplicationDbContext db, ILogger<GameHistory<TState>> logger)
    : IGameHistory<TState>
    where TState : ISchemaVersioned
{
    public async Task<StoredState<TState>?> Begin(Guid gameId, TState initial, CancellationToken ct = default)
    {
        var begun = await db
            .Database.CreateExecutionStrategy()
            .ExecuteAsync(async () =>
            {
                db.ChangeTracker.Clear();
                if (await FindHead(gameId, ct) is not null)
                    return false;

                db.GameSnapshots.Add(CreateSnapshot(gameId, 0, initial));
                return await TrySave(ct);
            });
        if (!begun)
        {
            LogBeginRefusedAlreadyBegun(logger, gameId);
            return null;
        }

        LogHistoryBegun(logger, gameId);
        return new StoredState<TState>(0, initial);
    }

    public Task<StoredState<TState>?> Append(
        Guid gameId,
        StoredState<TState> current,
        StepResult<TState> result,
        PlayerChoice? choice,
        CancellationToken ct = default
    ) => AppendCore(gameId, current, result, choice, restoredVersion: null, ct);

    public async Task<StoredState<TState>?> LoadCurrent(Guid gameId, CancellationToken ct = default)
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

    public async Task<StoredState<TState>?> LoadAt(Guid gameId, int version, CancellationToken ct = default)
    {
        var loaded = await LoadHistoryAt(gameId, version, ct);
        return loaded is null ? null : Reconstruct(gameId, loaded.Value.History);
    }

    public async Task<StoredState<TState>?> Restore(
        Guid gameId,
        StoredState<TState> current,
        int targetVersion,
        CancellationToken ct = default
    )
    {
        if (targetVersion >= current.Version)
        {
            LogRestoreRefusedTargetNotBeforeHead(logger, gameId, targetVersion, current.Version);
            return null;
        }

        var loaded = await LoadHistoryAt(gameId, targetVersion, ct);
        if (loaded is null)
            return null;

        var target = Reconstruct(gameId, loaded.Value.History);
        var restored = await AppendCore(
            gameId,
            current,
            new StepResult<TState>(target.State, loaded.Value.Checkpoint),
            choice: null,
            restoredVersion: targetVersion,
            ct
        );
        if (restored is not null)
            LogStateRestored(logger, gameId, targetVersion, restored.Version);
        return restored;
    }

    private async Task<StoredState<TState>?> AppendCore(
        Guid gameId,
        StoredState<TState> current,
        StepResult<TState> result,
        PlayerChoice? choice,
        int? restoredVersion,
        CancellationToken ct = default
    )
    {
        var version = current.Version + 1;
        var writesSnapshot = result.Checkpoint is not null || result.IsBaseline || result.IsIrreversible;
        var appended = await db
            .Database.CreateExecutionStrategy()
            .ExecuteAsync(async () =>
            {
                db.ChangeTracker.Clear();
                var head = await FindHead(gameId, ct);
                if (head != current.Version)
                    return new AppendAttempt(Saved: false, head);

                var patch = SerializeToJson(current.State).CreatePatch(SerializeToJson(result.State));
                db.GameSteps.Add(
                    new GameStep
                    {
                        GameId = gameId,
                        Version = version,
                        Actor = choice?.Member,
                        Action = choice?.Action,
                        Patch = JsonSerializer.SerializeToDocument(patch),
                        Checkpoint = result.Checkpoint,
                        IsIrreversible = result.IsIrreversible,
                        IsBaseline = result.IsBaseline,
                        RestoredVersion = restoredVersion,
                    }
                );
                if (writesSnapshot)
                {
                    db.GameSnapshots.Add(CreateSnapshot(gameId, version, result.State));
                }

                return new AppendAttempt(await TrySave(ct), head);
            });
        if (!appended.Saved)
        {
            LogAppendRefusal(gameId, current.Version, appended.Head);
            return null;
        }

        LogStepAppended(logger, gameId, version);
        if (writesSnapshot)
        {
            LogSnapshotWritten(logger, gameId, version);
        }

        return new StoredState<TState>(version, result.State);
    }

    private void LogAppendRefusal(Guid gameId, int currentVersion, int? head)
    {
        if (head is null)
            LogAppendRefusedNotBegun(logger, gameId, currentVersion);
        else if (head != currentVersion)
            LogAppendRefusedStale(logger, gameId, currentVersion, head.Value);
        else
            LogAppendRefusedConcurrent(logger, gameId, currentVersion);
    }

    private async Task<(LoadedHistory History, string? Checkpoint)?> LoadHistoryAt(
        Guid gameId,
        int version,
        CancellationToken ct = default
    )
    {
        if (version < 0)
        {
            LogLoadAtRefusedInvalidVersion(logger, gameId, version);
            return null;
        }

        var loaded = await db
            .Database.CreateExecutionStrategy()
            .ExecuteAsync(async () =>
            {
                await using var transaction = await db.Database.BeginTransactionAsync(
                    IsolationLevel.RepeatableRead,
                    ct
                );
                return await ReadHistoryAt(gameId, version, ct);
            });
        if (loaded.Barrier is not null)
        {
            LogLoadAtRefusedBehindBarrier(logger, gameId, version, loaded.Barrier.Value);
            return null;
        }
        if (loaded.History is null)
        {
            LogLoadAtRefusal(gameId, version, loaded.Reason);
            return null;
        }
        return (loaded.History, loaded.Checkpoint);
    }

    private async Task<HistoryRead> ReadHistoryAt(Guid gameId, int version, CancellationToken ct = default)
    {
        var barrier = await db
            .GameSteps.Where(s => s.GameId == gameId && s.Version > version && (s.IsIrreversible || s.IsBaseline))
            .MinAsync(s => (int?)s.Version, ct);
        if (barrier is not null)
            return new HistoryRead(History: null, Checkpoint: null, barrier, LoadRefusal.None);
        var snapshot = await db
            .GameSnapshots.AsNoTracking()
            .OrderByDescending(s => s.Version)
            .FirstOrDefaultAsync(s => s.GameId == gameId && s.Version <= version, ct);
        if (snapshot is null)
            return new HistoryRead(History: null, Checkpoint: null, Barrier: null, LoadRefusal.NoSnapshot);
        var steps = await db
            .GameSteps.AsNoTracking()
            .Where(s => s.GameId == gameId && s.Version > snapshot.Version && s.Version <= version)
            .OrderBy(s => s.Version)
            .ToListAsync(ct);
        var target = steps.FirstOrDefault(s => s.Version == version);
        if (version != 0 && snapshot.Version == version)
        {
            target = await db
                .GameSteps.AsNoTracking()
                .SingleOrDefaultAsync(s => s.GameId == gameId && s.Version == version, ct);
        }
        if (version != 0 && target is null)
            return new HistoryRead(History: null, Checkpoint: null, Barrier: null, LoadRefusal.MissingVersion);
        if (
            steps.Count != version - snapshot.Version
            || steps.Where((s, i) => s.Version != snapshot.Version + i + 1).Any()
        )
            return new HistoryRead(History: null, Checkpoint: null, Barrier: null, LoadRefusal.Gap);
        return new HistoryRead(new LoadedHistory(snapshot, steps), target?.Checkpoint, Barrier: null, LoadRefusal.None);
    }

    private void LogLoadAtRefusal(Guid gameId, int version, LoadRefusal reason)
    {
        switch (reason)
        {
            case LoadRefusal.NoSnapshot:
                LogLoadAtRefusedNoSnapshot(logger, gameId, version);
                break;
            case LoadRefusal.MissingVersion:
                LogLoadAtRefusedMissingVersion(logger, gameId, version);
                break;
            case LoadRefusal.Gap:
                LogLoadAtRefusedGap(logger, gameId, version);
                break;
        }
    }

    private static StoredState<TState> Reconstruct(Guid gameId, LoadedHistory history)
    {
        var node = history.Snapshot.State.Deserialize<JsonNode>();
        foreach (var step in history.Steps)
        {
            var result = step.Patch.Deserialize<JsonPatch>()!.Apply(node);
            if (!result.IsSuccess)
                throw new InvalidOperationException(
                    string.Create(
                        CultureInfo.InvariantCulture,
                        $"Step {step.Version} of game {gameId} does not apply to the state before it: {result.Error}"
                    )
                );
            node = result.Result;
        }
        return new StoredState<TState>(
            history.Steps.Count == 0 ? history.Snapshot.Version : history.Steps[^1].Version,
            Deserialize(node)
        );
    }

    private async Task<bool> TrySave(CancellationToken ct = default)
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

    private async Task<int?> FindHead(Guid gameId, CancellationToken ct = default) =>
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

    private static TState Deserialize(JsonNode? node) =>
        node.Deserialize<TState>() ?? throw new InvalidOperationException("A stored state cannot be null.");

    private sealed record AppendAttempt(bool Saved, int? Head);

    private sealed record LoadedHistory(GameSnapshot Snapshot, List<GameStep> Steps);

    private sealed record HistoryRead(LoadedHistory? History, string? Checkpoint, int? Barrier, LoadRefusal Reason);

    private enum LoadRefusal
    {
        None,
        NoSnapshot,
        MissingVersion,
        Gap,
    }

    [LoggerMessage(LogLevel.Information, "Game {GameId} restored from version {RestoredVersion} at version {Version}")]
    private static partial void LogStateRestored(ILogger logger, Guid gameId, int restoredVersion, int version);

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

    [LoggerMessage(LogLevel.Warning, "Load refused for game {GameId}: version {Version} does not exist")]
    private static partial void LogLoadAtRefusedMissingVersion(ILogger logger, Guid gameId, int version);

    [LoggerMessage(LogLevel.Warning, "Load refused for game {GameId}: patch chain to version {Version} has a gap")]
    private static partial void LogLoadAtRefusedGap(ILogger logger, Guid gameId, int version);

    [LoggerMessage(LogLevel.Information, "Load refused for game {GameId}: version {Version} is negative")]
    private static partial void LogLoadAtRefusedInvalidVersion(ILogger logger, Guid gameId, int version);

    [LoggerMessage(
        LogLevel.Information,
        "Restore refused for game {GameId}: target {Version} is not before previous version {Head}"
    )]
    private static partial void LogRestoreRefusedTargetNotBeforeHead(
        ILogger logger,
        Guid gameId,
        int version,
        int head
    );
}
