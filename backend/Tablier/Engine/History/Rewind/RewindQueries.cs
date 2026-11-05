using Microsoft.EntityFrameworkCore;
using Tablier.Data;

namespace Tablier.Engine.History.Rewind;

public sealed partial class RewindQueries(ApplicationDbContext db, ILogger<RewindQueries> logger) : IRewindQueries
{
    public sealed record RewindRow(string? Checkpoint, int Version, string? Actor);

    public async Task<RewindMetadata> Load(Guid gameId, int headVersion, CancellationToken ct = default)
    {
        var boundary =
            await db
                .GameSteps.Where(step => step.GameId == gameId && (step.IsBaseline || step.IsIrreversible))
                .MaxAsync(step => (int?)step.Version, ct)
            ?? 0;
        var rows = await ReadTargets(gameId, headVersion, boundary, ct);
        var checkpoints = rows.Where(row => row.Checkpoint is not null)
            .ToDictionary(row => row.Checkpoint!, row => row.Version, StringComparer.Ordinal);
        var undo = rows.FirstOrDefault(row => row.Actor is not null);
        LogLoaded(logger, gameId, headVersion, checkpoints.Count);
        return new RewindMetadata(
            headVersion,
            boundary,
            checkpoints,
            undo is null ? null : new UndoTarget(undo.Version, undo.Actor!)
        );
    }

    private Task<List<RewindRow>> ReadTargets(
        Guid gameId,
        int headVersion,
        int boundary,
        CancellationToken ct = default
    ) =>
        db
            .Database.SqlQuery<RewindRow>(
                $"""
                WITH RECURSIVE live AS (
                    SELECT s."Version", s."Actor", s."Checkpoint", s."RestoredVersion", true AS is_live, s."Version" AS represented
                    FROM "GameSteps" s WHERE s."GameId" = {gameId} AND s."Version" = {headVersion}
                    UNION ALL
                    SELECT s."Version", s."Actor", s."Checkpoint", s."RestoredVersion", p."RestoredVersion" IS NULL,
                           CASE WHEN p."RestoredVersion" IS NULL THEN s."Version" ELSE p.represented END
                    FROM live p JOIN "GameSteps" s ON s."GameId" = {gameId}
                      AND s."Version" = COALESCE(p."RestoredVersion", p."Version" - 1)
                    WHERE s."Version" >= {boundary}
                ), checkpoints AS (
                    SELECT DISTINCT ON (l."Checkpoint") l."Checkpoint", l."Version" FROM live l
                    WHERE l.is_live AND l."Checkpoint" IS NOT NULL ORDER BY l."Checkpoint", l."Version" DESC
                ), latest_action AS (
                    SELECT l."Version" - 1 AS destination, l."Actor" FROM live l
                    WHERE l."RestoredVersion" IS NULL AND l."Actor" IS NOT NULL ORDER BY l.represented DESC LIMIT 1
                )
                SELECT c."Checkpoint", c."Version", NULL::text AS "Actor" FROM checkpoints c
                UNION ALL
                SELECT NULL::text AS "Checkpoint", a.destination AS "Version", a."Actor" FROM latest_action a
                WHERE a.destination > 0 AND a.destination >= {boundary}
                  AND EXISTS (SELECT 1 FROM live l WHERE l.is_live AND l."Version" = a.destination)
                """
            )
            .ToListAsync(ct);

    [LoggerMessage(LogLevel.Debug, "Game {GameId} metadata reconstructed at {Version} with {Count} checkpoints")]
    private static partial void LogLoaded(ILogger logger, Guid gameId, int version, int count);
}
