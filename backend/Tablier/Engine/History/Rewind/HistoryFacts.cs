using System.Runtime.CompilerServices;
using Microsoft.EntityFrameworkCore;
using Tablier.Data;

namespace Tablier.Engine.History.Rewind;

internal static class HistoryFacts
{
    private const string LiveHistorySql = """
        WITH RECURSIVE bounds AS (
            SELECT COALESCE(MAX("Version") FILTER (WHERE "IsBaseline" OR "IsIrreversible"), 0) AS barrier
            FROM "GameSteps" WHERE "GameId" = {0}
        ), live AS (
            SELECT s."Version", s."Actor", s."Checkpoints", s."RestoredVersion", true AS is_live, s."Version" AS represented
            FROM "GameSteps" s WHERE s."GameId" = {0} AND s."Version" = {1}
            UNION ALL
            SELECT s."Version", s."Actor", s."Checkpoints", s."RestoredVersion", p."RestoredVersion" IS NULL,
                   CASE WHEN p."RestoredVersion" IS NULL THEN s."Version" ELSE p.represented END
            FROM live p JOIN "GameSteps" s ON s."GameId" = {0}
                AND s."Version" = COALESCE(p."RestoredVersion", p."Version" - 1)
            CROSS JOIN bounds b WHERE s."Version" >= b.barrier
                AND (p."RestoredVersion" IS NULL OR p."RestoredVersion" < p."Version")
        ), reconstruction AS (
            SELECT MAX("Version") AS snapshot_version FROM "GameSnapshots"
            WHERE "GameId" = {0} AND "Version" <= {1}
        ), validity AS (
            SELECT b.barrier, CASE
                WHEN b.barrier > {1} THEN 'behind_barrier'
                WHEN {1} < 0 OR NOT (EXISTS (SELECT 1 FROM live WHERE "Version" = {1})
                    OR ({1} = 0 AND EXISTS (SELECT 1 FROM "GameSnapshots" WHERE "GameId" = {0} AND "Version" = 0)))
                    THEN 'missing_head'
                WHEN r.snapshot_version IS NULL THEN 'no_snapshot'
                WHEN (SELECT COUNT(*) FROM "GameSteps" s WHERE s."GameId" = {0}
                    AND s."Version" > r.snapshot_version AND s."Version" <= {1}) <> {1} - r.snapshot_version
                    THEN 'physical_gap'
                WHEN EXISTS (
                    SELECT 1 FROM live l WHERE
                        (l."RestoredVersion" IS NOT NULL AND l."RestoredVersion" >= l."Version")
                        OR (COALESCE(l."RestoredVersion", l."Version" - 1) >= GREATEST(b.barrier, 1)
                            AND NOT EXISTS (SELECT 1 FROM "GameSteps" s WHERE s."GameId" = {0}
                                AND s."Version" = COALESCE(l."RestoredVersion", l."Version" - 1)))
                ) THEN 'gap' ELSE NULL END AS reason
            FROM bounds b CROSS JOIN reconstruction r
        )
        """;

    private const string SummarySql = """
        , checkpoints AS (
            SELECT DISTINCT ON (checkpoint_id) checkpoint_id, l."Version"
            FROM live l CROSS JOIN LATERAL unnest(l."Checkpoints") AS checkpoint_id
            WHERE l.is_live ORDER BY checkpoint_id, l."Version" DESC
        ), latest_action AS (
            SELECT l."Version", l."Actor" FROM live l
            WHERE l."RestoredVersion" IS NULL AND l."Actor" IS NOT NULL
            ORDER BY l.represented DESC LIMIT 1
        )
        SELECT NULL::text AS "CheckpointId", {1} AS "Version", NULL::text AS "Actor",
               v.barrier AS "BarrierVersion", v.reason AS "RefusalReason" FROM validity v
        UNION ALL
        SELECT c.checkpoint_id, c."Version", NULL::text, v.barrier, v.reason FROM checkpoints c CROSS JOIN validity v
        UNION ALL
        SELECT NULL::text, a."Version", a."Actor", v.barrier, v.reason FROM latest_action a CROSS JOIN validity v
        """;

    private const string ActorsSql = """
        SELECT NULL::text AS "Actor", v.reason AS "RefusalReason" FROM validity v
        UNION ALL
        SELECT DISTINCT l."Actor", v.reason FROM live l CROSS JOIN validity v
        WHERE v.reason IS NULL AND l."RestoredVersion" IS NULL AND l."Actor" IS NOT NULL
            AND l.represented > {2} AND l.represented <= {1}
        """;

    public static async Task<(HistorySummary? Summary, string? RefusalReason)> ReadSummary(
        ApplicationDbContext db,
        Guid gameId,
        int headVersion,
        CancellationToken ct = default
    )
    {
        var rows = await db
            .Database.SqlQuery<SummaryRow>(
                FormattableStringFactory.Create(LiveHistorySql + SummarySql, gameId, headVersion)
            )
            .ToListAsync(ct);
        if (rows[0].RefusalReason is not null)
            return (null, rows[0].RefusalReason);
        var checkpoints = rows.Where(row => row.CheckpointId is not null)
            .ToDictionary(row => row.CheckpointId!, row => row.Version, StringComparer.Ordinal);
        var lastAction = rows.FirstOrDefault(row => row.Actor is not null);
        return (
            new HistorySummary(
                headVersion,
                rows[0].BarrierVersion,
                checkpoints,
                lastAction is null ? null : new HistoryAction(lastAction.Version, lastAction.Actor!)
            ),
            null
        );
    }

    public static async Task<(IReadOnlySet<string>? Actors, string? RefusalReason)> ReadActors(
        ApplicationDbContext db,
        Guid gameId,
        int fromVersionExclusive,
        int toVersionInclusive,
        CancellationToken ct = default
    )
    {
        var rows = await db
            .Database.SqlQuery<ActorRow>(
                FormattableStringFactory.Create(
                    LiveHistorySql + ActorsSql,
                    gameId,
                    toVersionInclusive,
                    fromVersionExclusive
                )
            )
            .ToListAsync(ct);
        return rows[0].RefusalReason is null
            ? (
                rows.Where(row => row.Actor is not null).Select(row => row.Actor!).ToHashSet(StringComparer.Ordinal),
                null
            )
            : (null, rows[0].RefusalReason);
    }

    public static async Task<bool> IsLiveVersion(
        ApplicationDbContext db,
        Guid gameId,
        int headVersion,
        int targetVersion,
        CancellationToken ct = default
    ) =>
        (
            await db
                .Database.SqlQuery<bool>(
                    FormattableStringFactory.Create(
                        LiveHistorySql
                            + """
                            SELECT EXISTS (SELECT 1 FROM live l CROSS JOIN validity v
                                WHERE v.reason IS NULL AND l.is_live AND l."Version" = {2}) AS "Value"
                            """,
                        gameId,
                        headVersion,
                        targetVersion
                    )
                )
                .ToListAsync(ct)
        ).Single();

    private sealed record ActorRow(string? Actor, string? RefusalReason);

    private sealed record SummaryRow(
        string? CheckpointId,
        int Version,
        string? Actor,
        int BarrierVersion,
        string? RefusalReason
    );
}
