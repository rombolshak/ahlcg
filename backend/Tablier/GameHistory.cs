using System.Data;
using System.Globalization;
using System.Text.Json;
using System.Text.Json.Nodes;
using Json.Patch;
using Microsoft.EntityFrameworkCore;
using Npgsql;
using Tablier.Contract;
using Tablier.Data;

namespace Tablier;

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
        var writesSnapshot = result.Checkpoint is not null || result.IsBaseline;
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
                        Checkpoint = result.Checkpoint,
                        IsIrreversible = result.IsIrreversible,
                        IsBaseline = result.IsBaseline,
                    }
                );
                if (writesSnapshot)
                {
                    db.GameSnapshots.Add(CreateSnapshot(gameId, version, result.State));
                }

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

    public async Task<StoredState<TState>?> LoadAt(Guid gameId, int version, CancellationToken ct)
    {
        var barrier = await db
            .GameSteps.Where(s => s.GameId == gameId && s.Version > version && (s.IsIrreversible || s.IsBaseline))
            .MinAsync(s => (int?)s.Version, ct);
        if (barrier is not null)
        {
            LogLoadAtRefusedBehindBarrier(logger, gameId, version, barrier.Value);
            return null;
        }

        var snapshot = await db
            .GameSnapshots.AsNoTracking()
            .SingleOrDefaultAsync(s => s.GameId == gameId && s.Version == version, ct);
        if (snapshot is null)
        {
            LogLoadAtRefusedNoSnapshot(logger, gameId, version);
            return null;
        }

        return new StoredState<TState>(version, Deserialize(snapshot.State));
    }

    public Task Invalidate(Guid gameId, CancellationToken ct) => Task.CompletedTask;

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

    [LoggerMessage(LogLevel.Warning, "Load refused for game {GameId}: no snapshot at version {Version}")]
    private static partial void LogLoadAtRefusedNoSnapshot(ILogger logger, Guid gameId, int version);
}
