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

internal sealed class GameHistoryConflictException(Guid gameId, int version)
    : InvalidOperationException("Begin requires game history at version zero.")
{
    public Guid GameId { get; } = gameId;
    public int Version { get; } = version;
}
#pragma warning restore MA0048

internal sealed partial class GameHistory<TState> : IGameHistory<TState>
    where TState : ISchemaVersioned
{
    private readonly ApplicationDbContext _db;
    private readonly ILogger<GameHistory<TState>> _logger;

    public GameHistory(ApplicationDbContext db, ILogger<GameHistory<TState>> logger)
    {
        _db = db;
        _logger = logger;
    }

    public async Task<StoredState<TState>> Begin(Guid gameId, TState initial, CancellationToken ct = default)
    {
        var outcome = await _db
            .Database.CreateExecutionStrategy()
            .ExecuteAsync(async () =>
            {
                _db.ChangeTracker.Clear();
                var existing = await ReadBeginning(gameId, ct);
                if (existing.Head is not null)
                    return (existing.Stored, existing.Head, Created: false);

                _db.GameSnapshots.Add(CreateSnapshot(gameId, 0, initial));
                if (await TrySave(ct))
                    return (
                        Stored: (StoredState<TState>?)new StoredState<TState>(0, initial),
                        Head: (int?)0,
                        Created: true
                    );

                var winner = await ReadBeginning(gameId, ct);
                if (winner.Head is null)
                    throw new InvalidOperationException("History is missing after a concurrent Begin.");
                return (winner.Stored, winner.Head, Created: false);
            });
        if (outcome.Head != 0)
        {
            LogBeginRefusedAdvanced(_logger, gameId, outcome.Head!.Value);
            throw new GameHistoryConflictException(gameId, outcome.Head.Value);
        }

        if (outcome.Created)
            LogHistoryBegun(_logger, gameId);
        else
            LogBeginReplayed(_logger, gameId);
        return outcome.Stored!;
    }

    public async Task<StoredState<TState>?> Append(
        Guid gameId,
        StoredState<TState> previous,
        StepResult<TState> result,
        PlayerChoice? choice,
        CancellationToken ct = default
    )
    {
        if (result.Checkpoints.Contains("undo", StringComparer.Ordinal))
        {
            LogAppendRefusedReservedCheckpoint(_logger, gameId, previous.Version);
            throw new InvalidOperationException("Rules cannot append the reserved undo checkpoint.");
        }

        var writesSnapshot = result.Checkpoints.Count > 0 || result.IsBaseline || result.IsIrreversible;
        var appended = await _db
            .Database.CreateExecutionStrategy()
            .ExecuteAsync(() => TryAppend(gameId, previous, result, choice, writesSnapshot, ct));
        if (appended.MissingHistory)
        {
            LogAppendRefusedNotBegun(_logger, gameId, previous.Version);
            throw new InvalidOperationException("Appending requires initialized game history.");
        }

        if (!appended.Appended)
        {
            if (appended.Concurrent)
                LogAppendRefusedConcurrent(_logger, gameId, previous.Version);
            else
                LogAppendRefusedStale(_logger, gameId, previous.Version, appended.Head!.Value);
            return null;
        }

        LogStepAppended(_logger, gameId, previous.Version + 1);
        if (writesSnapshot)
        {
            LogSnapshotWritten(_logger, gameId, previous.Version + 1);
        }

        return new StoredState<TState>(previous.Version + 1, result.State);
    }

    public async Task<StoredState<TState>?> LoadCurrent(Guid gameId, CancellationToken ct = default)
    {
        var history = await _db
            .Database.CreateExecutionStrategy()
            .ExecuteAsync(async () =>
            {
                await using var transaction = await _db.Database.BeginTransactionAsync(
                    IsolationLevel.RepeatableRead,
                    ct
                );
                var snapshot = await _db
                    .GameSnapshots.AsNoTracking()
                    .Where(s => s.GameId == gameId)
                    .OrderByDescending(s => s.Version)
                    .FirstOrDefaultAsync(ct);
                if (snapshot is null)
                {
                    var hasSteps = await _db.GameSteps.AnyAsync(s => s.GameId == gameId, ct);
                    return (History: (LoadedHistory?)null, HasOrphanSteps: hasSteps);
                }

                var steps = await _db
                    .GameSteps.AsNoTracking()
                    .Where(s => s.GameId == gameId && s.Version > snapshot.Version)
                    .OrderBy(s => s.Version)
                    .ToListAsync(ct);
                return (History: (LoadedHistory?)new LoadedHistory(snapshot, steps), HasOrphanSteps: false);
            });

        if (history.HasOrphanSteps)
        {
            LogLoadRefusedNoSnapshot(_logger, gameId);
            throw new InvalidOperationException("Persisted game steps have no required snapshot.");
        }

        if (history.History is null)
        {
            LogLoadRefusedNotBegun(_logger, gameId);
            return null;
        }

        return Reconstruct(gameId, history.History);
    }

    public async Task<StoredState<TState>> LoadAt(Guid gameId, int version, CancellationToken ct = default)
    {
        if (version < 0)
        {
            LogLoadAtRefusedInvalidVersion(_logger, gameId, version);
            throw new ArgumentOutOfRangeException(nameof(version), version, "The version cannot be negative.");
        }
        var history = await _db
            .Database.CreateExecutionStrategy()
            .ExecuteAsync(async () =>
            {
                await using var transaction = await _db.Database.BeginTransactionAsync(
                    IsolationLevel.RepeatableRead,
                    ct
                );
                return await ReadHistoryAt(gameId, version, ct);
            });
        switch (history.Refusal)
        {
            case LoadRefusal.NoHistory:
                LogLoadRefusedNotBegun(_logger, gameId);
                throw new InvalidOperationException("Historical reads require initialized game history.");
            case LoadRefusal.InvalidVersion:
                LogLoadAtRefusedInvalidVersion(_logger, gameId, version);
                throw new ArgumentOutOfRangeException(
                    nameof(version),
                    version,
                    "The version is beyond the stored head."
                );
            case LoadRefusal.BehindBarrier:
                LogLoadAtRefusedBehindBarrier(_logger, gameId, version, history.Barrier!.Value);
                throw new InvalidOperationException(
                    "The requested version is behind the irreversible or baseline barrier."
                );
            case LoadRefusal.NoSnapshot:
                LogLoadAtRefusedNoSnapshot(_logger, gameId, version);
                throw new InvalidOperationException("The requested version has no required snapshot.");
            case LoadRefusal.Gap:
                LogLoadAtRefusedGap(_logger, gameId, version);
                throw new InvalidOperationException("The patch chain to the requested version has a gap.");
        }

        var storedState = Reconstruct(gameId, history.History!);
        LogStateLoadedAt(_logger, gameId, version);
        return storedState;
    }

    private async Task<(bool Appended, int? Head, bool Concurrent, bool MissingHistory)> TryAppend(
        Guid gameId,
        StoredState<TState> previous,
        StepResult<TState> result,
        PlayerChoice? choice,
        bool writesSnapshot,
        CancellationToken ct = default
    )
    {
        var version = previous.Version + 1;
        _db.ChangeTracker.Clear();
        var versions = await FindHistoryVersions(gameId, ct);
        var head = versions.Head;
        if (head is null || versions.Snapshot is null)
        {
            return (Appended: false, Head: head, Concurrent: false, MissingHistory: true);
        }

        if (head != previous.Version)
        {
            return (Appended: false, Head: head, Concurrent: false, MissingHistory: false);
        }

        var patch = SerializeToJson(previous.State).CreatePatch(SerializeToJson(result.State));
        _db.GameSteps.Add(
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
            _db.GameSnapshots.Add(CreateSnapshot(gameId, version, result.State));

        var saved = await TrySave(ct);
        return (Appended: saved, Head: head, Concurrent: !saved, MissingHistory: false);
    }

    private async Task<(StoredState<TState>? Stored, int? Head)> ReadBeginning(
        Guid gameId,
        CancellationToken ct = default
    )
    {
        await using var transaction = await _db.Database.BeginTransactionAsync(IsolationLevel.RepeatableRead, ct);
        var head = (await FindHistoryVersions(gameId, ct)).Head;
        if (head != 0)
            return (Stored: null, head);

        var snapshot = await _db
            .GameSnapshots.AsNoTracking()
            .SingleOrDefaultAsync(s => s.GameId == gameId && s.Version == 0, ct)
            ?? throw new InvalidOperationException("Version zero has no required snapshot.");
        return (new StoredState<TState>(0, Deserialize(gameId, snapshot.Version, snapshot.State)), head);
    }

    private async Task<HistoryRead> ReadHistoryAt(Guid gameId, int version, CancellationToken ct = default)
    {
        var head = (await FindHistoryVersions(gameId, ct)).Head;
        if (head is null)
            return new HistoryRead(History: null, Barrier: null, LoadRefusal.NoHistory);
        if (version > head)
            return new HistoryRead(History: null, Barrier: null, LoadRefusal.InvalidVersion);

        var barrier = await _db
            .GameSteps.Where(s => s.GameId == gameId && (s.IsIrreversible || s.IsBaseline))
            .MaxAsync(s => (int?)s.Version, ct);
        if (barrier > version)
            return new HistoryRead(History: null, barrier, LoadRefusal.BehindBarrier);

        var snapshot = await _db
            .GameSnapshots.AsNoTracking()
            .Where(s => s.GameId == gameId && s.Version <= version)
            .OrderByDescending(s => s.Version)
            .FirstOrDefaultAsync(ct);
        if (snapshot is null)
            return new HistoryRead(History: null, Barrier: null, LoadRefusal.NoSnapshot);
        if (snapshot.Version == version)
            return new HistoryRead(new LoadedHistory(snapshot, []), Barrier: null, LoadRefusal.None);

        var steps = await _db
            .GameSteps.AsNoTracking()
            .Where(s => s.GameId == gameId && s.Version > snapshot.Version && s.Version <= version)
            .OrderBy(s => s.Version)
            .ToListAsync(ct);
        if (steps.Count != version - snapshot.Version)
            return new HistoryRead(History: null, Barrier: null, LoadRefusal.Gap);
        return new HistoryRead(new LoadedHistory(snapshot, steps), Barrier: null, LoadRefusal.None);
    }

    private StoredState<TState> Reconstruct(Guid gameId, LoadedHistory history)
    {
        if (history.Steps.Count == 0)
        {
            return new StoredState<TState>(
                history.Snapshot.Version,
                Deserialize(gameId, history.Snapshot.Version, history.Snapshot.State)
            );
        }

        var node = history.Snapshot.State.Deserialize<JsonNode>();
        var expectedVersion = history.Snapshot.Version + 1;
        foreach (var step in history.Steps)
        {
            if (step.Version != expectedVersion++)
            {
                LogLoadAtRefusedGap(_logger, gameId, step.Version);
                throw new InvalidOperationException("The stored patch chain has a gap.");
            }
            var patch = DeserializePatch(gameId, step);
            if (patch is null)
            {
                LogLoadRefusedInvalidPatch(_logger, gameId, step.Version);
                throw new InvalidOperationException("A stored step patch cannot be null.");
            }

            var result = patch.Apply(node);
            if (!result.IsSuccess)
            {
                LogLoadRefusedInvalidPatch(_logger, gameId, step.Version);
                throw new InvalidOperationException(
                    string.Create(
                        CultureInfo.InvariantCulture,
                        $"Step {step.Version} of game {gameId} does not apply to the state before it."
                    )
                );
            }

            node = result.Result;
        }

        return new StoredState<TState>(history.Steps[^1].Version, Deserialize(gameId, history.Steps[^1].Version, node));
    }

    private JsonPatch? DeserializePatch(Guid gameId, GameStep step)
    {
        try
        {
            return step.Patch.Deserialize<JsonPatch>();
        }
        catch (JsonException e)
        {
            LogLoadRefusedInvalidPatch(_logger, gameId, step.Version);
            throw new InvalidOperationException(
                string.Create(
                    CultureInfo.InvariantCulture,
                    $"Patch at version {step.Version} of game {gameId} is malformed."
                ),
                e
            );
        }
    }

    private async Task<bool> TrySave(CancellationToken ct = default)
    {
        try
        {
            await _db.SaveChangesAsync(ct);
            return true;
        }
        catch (DbUpdateException e) when (IsUniqueViolation(e))
        {
            return false;
        }
        finally
        {
            _db.ChangeTracker.Clear();
        }
    }

    private static bool IsUniqueViolation(DbUpdateException e) =>
        e.InnerException is PostgresException { SqlState: PostgresErrorCodes.UniqueViolation };

    private async Task<(int? Head, int? Snapshot)> FindHistoryVersions(Guid gameId, CancellationToken ct = default)
    {
        var stepVersion = await _db.GameSteps.Where(s => s.GameId == gameId).MaxAsync(s => (int?)s.Version, ct);
        var snapshotVersion = await _db.GameSnapshots.Where(s => s.GameId == gameId).MaxAsync(s => (int?)s.Version, ct);
        if (stepVersion is null)
            return (snapshotVersion, snapshotVersion);
        if (snapshotVersion is null)
            return (stepVersion, snapshotVersion);
        return (Math.Max(stepVersion.Value, snapshotVersion.Value), snapshotVersion);
    }

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

    private static TState Deserialize(Guid gameId, int version, JsonDocument document)
    {
        try
        {
            return document.Deserialize<TState>()
                ?? throw new InvalidOperationException("A stored state cannot be null.");
        }
        catch (JsonException e)
        {
            throw new InvalidOperationException(
                string.Create(
                    CultureInfo.InvariantCulture,
                    $"Snapshot state at version {version} of game {gameId} is malformed."
                ),
                e
            );
        }
    }

    private static TState Deserialize(Guid gameId, int version, JsonNode? node)
    {
        try
        {
            return node.Deserialize<TState>() ?? throw new InvalidOperationException("A stored state cannot be null.");
        }
        catch (JsonException e)
        {
            throw new InvalidOperationException(
                string.Create(
                    CultureInfo.InvariantCulture,
                    $"Reconstructed state at version {version} of game {gameId} is malformed."
                ),
                e
            );
        }
    }

    private sealed record LoadedHistory(GameSnapshot Snapshot, List<GameStep> Steps);

    private sealed record HistoryRead(LoadedHistory? History, int? Barrier, LoadRefusal Refusal);

    private enum LoadRefusal
    {
        None,
        NoHistory,
        InvalidVersion,
        BehindBarrier,
        NoSnapshot,
        Gap,
    }

    [LoggerMessage(LogLevel.Warning, "Load refused for game {GameId}: persisted steps have no snapshot")]
    private static partial void LogLoadRefusedNoSnapshot(ILogger logger, Guid gameId);

    [LoggerMessage(LogLevel.Warning, "Load refused for game {GameId}: patch at version {Version} does not apply")]
    private static partial void LogLoadRefusedInvalidPatch(ILogger logger, Guid gameId, int version);

    [LoggerMessage(LogLevel.Warning, "Append refused for game {GameId}: it has not begun (previous version {Version})")]
    private static partial void LogAppendRefusedNotBegun(ILogger logger, Guid gameId, int version);

    [LoggerMessage(LogLevel.Information, "Append refused for game {GameId} at version {Version}: reserved checkpoint")]
    private static partial void LogAppendRefusedReservedCheckpoint(ILogger logger, Guid gameId, int version);

    [LoggerMessage(LogLevel.Information, "Load refused for game {GameId}: version {Version} is outside history")]
    private static partial void LogLoadAtRefusedInvalidVersion(ILogger logger, Guid gameId, int version);

    [LoggerMessage(
        LogLevel.Warning,
        "Load refused for game {GameId}: version {Version} is behind the irreversible or baseline step {Barrier}"
    )]
    private static partial void LogLoadAtRefusedBehindBarrier(ILogger logger, Guid gameId, int version, int barrier);

    [LoggerMessage(LogLevel.Warning, "Load refused for game {GameId}: no snapshot at or before version {Version}")]
    private static partial void LogLoadAtRefusedNoSnapshot(ILogger logger, Guid gameId, int version);

    [LoggerMessage(LogLevel.Warning, "Load refused for game {GameId}: patch chain to version {Version} has a gap")]
    private static partial void LogLoadAtRefusedGap(ILogger logger, Guid gameId, int version);

    [LoggerMessage(LogLevel.Warning, "Begin refused for game {GameId}: history advanced to version {Version}")]
    private static partial void LogBeginRefusedAdvanced(ILogger logger, Guid gameId, int version);

    [LoggerMessage(LogLevel.Information, "History of game {GameId} begun")]
    private static partial void LogHistoryBegun(ILogger logger, Guid gameId);

    [LoggerMessage(LogLevel.Debug, "Begin replayed for game {GameId} at version zero")]
    private static partial void LogBeginReplayed(ILogger logger, Guid gameId);

    [LoggerMessage(LogLevel.Debug, "Step {Version} appended to game {GameId}")]
    private static partial void LogStepAppended(ILogger logger, Guid gameId, int version);

    [LoggerMessage(LogLevel.Debug, "Snapshot written at version {Version} of game {GameId}")]
    private static partial void LogSnapshotWritten(ILogger logger, Guid gameId, int version);

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

    [LoggerMessage(LogLevel.Debug, "State loaded at version {Version} of game {GameId}")]
    private static partial void LogStateLoadedAt(ILogger logger, Guid gameId, int version);
}
