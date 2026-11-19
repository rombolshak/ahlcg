using Microsoft.EntityFrameworkCore;
using Npgsql;
using Tablier.Data;

namespace Tablier.Engine.History.Live;

internal static class LiveHistory
{
    internal const string ReadSql = """
        WITH RECURSIVE bounds AS (
          SELECT COALESCE(MAX("Version") FILTER (WHERE "IsBaseline" OR "IsIrreversible"), 0) AS barrier
          FROM "GameSteps" WHERE "GameId" = @gameId),
        snapshot AS (
          SELECT MAX("Version") AS version FROM "GameSnapshots"
          WHERE "GameId" = @gameId AND "Version" <= @head),
        walk AS (
          SELECT "Version", "RestoredVersion", "Actor", "Action", "Checkpoints", "IsBaseline", "IsIrreversible"
          FROM "GameSteps" WHERE "GameId" = @gameId AND "Version" = @head
          UNION ALL
          SELECT s."Version", s."RestoredVersion", s."Actor", s."Action", s."Checkpoints", s."IsBaseline", s."IsIrreversible"
          FROM walk w JOIN "GameSteps" s ON s."GameId" = @gameId
            AND s."Version" = COALESCE(w."RestoredVersion", w."Version") - 1
          WHERE NOT w."IsBaseline" AND NOT w."IsIrreversible"
            AND COALESCE(w."RestoredVersion", w."Version") > 0
            AND COALESCE(w."RestoredVersion", w."Version") <= w."Version"),
        validity AS (
          SELECT @head >= 0 AND b.barrier <= @head AND p.version IS NOT NULL
            AND (SELECT COUNT(*) FROM "GameSteps" WHERE "GameId" = @gameId
                 AND "Version" > p.version AND "Version" <= @head) = @head - p.version
            AND (@head = 0 OR EXISTS (SELECT FROM walk))
            AND (@head = 0 OR EXISTS (
              SELECT FROM walk terminal WHERE terminal."Version" = b.barrier
                OR (b.barrier = 0 AND COALESCE(terminal."RestoredVersion", terminal."Version") = 1)))
            AND NOT EXISTS (
              SELECT FROM walk w WHERE COALESCE(w."RestoredVersion", w."Version") <= 0
                OR COALESCE(w."RestoredVersion", w."Version") > w."Version"
                OR w."Version" < b.barrier) AS valid,
            b.barrier
          FROM bounds b CROSS JOIN snapshot p),
        checkpoints AS (
          SELECT DISTINCT ON (tag) tag, w."Version" FROM walk w
          CROSS JOIN LATERAL unnest(w."Checkpoints") AS tag
          WHERE tag <> 'undo' ORDER BY tag, w."Version" DESC),
        last_action AS (
          SELECT * FROM walk WHERE "Actor" IS NOT NULL AND "Action" IS NOT NULL
          ORDER BY "Version" DESC LIMIT 1)
        SELECT 'anchor' AS "Kind", v.valid AS "Valid", v.barrier AS "BarrierVersion",
          0 AS "Version", 0 AS "SourceVersion", NULL::text AS "Actor", NULL::text AS "Action", NULL::text AS "Tag"
        FROM validity v
        UNION ALL
        SELECT 'checkpoint', true, 0, "Version", 0, NULL, NULL, tag FROM checkpoints
        UNION ALL
        SELECT 'action', true, 0, "Version", COALESCE("RestoredVersion", "Version"), "Actor", "Action", NULL FROM last_action
        UNION ALL
        SELECT DISTINCT 'actor', true, 0, 0, 0, "Actor", NULL, NULL FROM walk
        WHERE "Version" > @lower AND "Version" <= @head AND "Actor" IS NOT NULL
        UNION ALL
        SELECT 'target', true, 0, "Version", 0, NULL, NULL, NULL FROM walk WHERE "Version" = @target
        """;

    internal static async Task<List<LiveFact>> Read(
        ApplicationDbContext db,
        Guid gameId,
        int head,
        int lower,
        int target,
        CancellationToken ct = default
    ) =>
        await db
            .Database.SqlQueryRaw<LiveFact>(
                ReadSql,
                new NpgsqlParameter("gameId", gameId),
                new NpgsqlParameter("head", head),
                new NpgsqlParameter("lower", lower),
                new NpgsqlParameter("target", target)
            )
            .ToListAsync(ct);

    internal static LiveFact GetAnchor(List<LiveFact> facts) =>
        facts.Single(fact => string.Equals(fact.Kind, "anchor", StringComparison.Ordinal));

    internal static HistorySummary GetSummary(int version, int barrierVersion, List<LiveFact> facts)
    {
        var action = facts.FirstOrDefault(fact => string.Equals(fact.Kind, "action", StringComparison.Ordinal));
        return new HistorySummary(
            version,
            barrierVersion,
            facts
                .Where(fact => string.Equals(fact.Kind, "checkpoint", StringComparison.Ordinal))
                .ToDictionary(fact => fact.Tag!, fact => fact.Version),
            action is null
                ? null
                : new HistoryAction(action.Version, action.SourceVersion, action.Actor!, action.Action!)
        );
    }
}
