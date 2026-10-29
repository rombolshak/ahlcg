using System.Data;
using Microsoft.EntityFrameworkCore;
using Tablier.Data;

namespace Tablier.Engine.History.Cleanup;

#pragma warning disable MA0048
public sealed record GameHistoryCleanupResult(int Games, long Steps, long Snapshots);
#pragma warning restore MA0048

public sealed partial class GameHistoryCleanup(ApplicationDbContext db, ILogger<GameHistoryCleanup> logger)
    : IGameHistoryCleanup
{
    public const long LockKey = 6770001;

    private const string DeleteUnreachableSql = """
        WITH bounds AS (
          SELECT "GameId",
                 MAX("Version") FILTER (WHERE "IsBaseline")     AS baseline,
                 MAX("Version") FILTER (WHERE "IsIrreversible") AS irreversible
          FROM "GameSteps" GROUP BY "GameId"),
        newest AS (SELECT "GameId", MAX("Version") AS version FROM "GameSnapshots" GROUP BY "GameId"),
        deleted_steps AS (
          DELETE FROM "GameSteps" s USING bounds b
          WHERE s."GameId" = b."GameId" AND s."Version" < b.baseline
          RETURNING s."GameId"),
        deleted_snapshots AS (
          DELETE FROM "GameSnapshots" s USING bounds b, newest n
          WHERE s."GameId" = b."GameId" AND s."GameId" = n."GameId"
            AND (s."Version" < b.baseline
                 OR (s."Version" > COALESCE(b.baseline, 0) AND s."Version" < b.irreversible AND s."Version" <> n.version))
          RETURNING s."GameId")
        SELECT (SELECT COUNT(DISTINCT "GameId") FROM (SELECT "GameId" FROM deleted_steps UNION ALL SELECT "GameId" FROM deleted_snapshots) d)::int AS "Games",
               (SELECT COUNT(*) FROM deleted_steps) AS "Steps",
               (SELECT COUNT(*) FROM deleted_snapshots) AS "Snapshots"
        """;

    public async Task<GameHistoryCleanupResult?> Run(CancellationToken ct)
    {
        var result = await db
            .Database.CreateExecutionStrategy()
            .ExecuteAsync(async () =>
            {
                await using var transaction = await db.Database.BeginTransactionAsync(IsolationLevel.ReadCommitted, ct);
                var locked = (
                    await db
                        .Database.SqlQuery<bool>($"""SELECT pg_try_advisory_xact_lock({LockKey}) AS "Value" """)
                        .ToListAsync(ct)
                ).Single();
                if (!locked)
                {
                    await transaction.RollbackAsync(ct);
                    return null;
                }

                var deleted = (
                    await db.Database.SqlQueryRaw<GameHistoryCleanupResult>(DeleteUnreachableSql).ToListAsync(ct)
                ).Single();
                await transaction.CommitAsync(ct);
                return deleted;
            });

        if (result is null)
        {
            LogCleanupSkippedLockHeld(logger);
        }
        else if (result.Steps == 0 && result.Snapshots == 0)
        {
            LogCleanupFoundNothing(logger);
        }
        else
        {
            LogCleanupDeleted(logger, result.Games, result.Steps, result.Snapshots);
        }

        return result;
    }

    [LoggerMessage(
        LogLevel.Information,
        "History cleanup deleted {Steps} steps and {Snapshots} snapshots from {Games} games"
    )]
    private static partial void LogCleanupDeleted(ILogger logger, int games, long steps, long snapshots);

    [LoggerMessage(LogLevel.Debug, "History cleanup found nothing to delete")]
    private static partial void LogCleanupFoundNothing(ILogger logger);

    [LoggerMessage(LogLevel.Information, "History cleanup skipped: another run holds the lock")]
    private static partial void LogCleanupSkippedLockHeld(ILogger logger);
}
