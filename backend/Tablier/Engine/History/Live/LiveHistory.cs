using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage;
using Npgsql;
using Tablier.Data;

namespace Tablier.Engine.History.Live;

internal sealed record LiveHistory(bool IsValid, int BarrierVersion, IReadOnlyList<LiveStep> Steps)
{
    private const string ReadBoundsSql = """
        SELECT COALESCE((SELECT MAX("Version") FROM "GameSteps"
          WHERE "GameId" = @gameId AND ("IsBaseline" OR "IsIrreversible")), 0),
          (SELECT MAX("Version") FROM "GameSnapshots" WHERE "GameId" = @gameId AND "Version" <= @head)
        """;

    private const string ReadStepsSql = """
        SELECT "Version", "RestoredVersion", "Actor", "Action", "Checkpoints", "IsBaseline", "IsIrreversible"
        FROM "GameSteps"
        WHERE "GameId" = @gameId AND "Version" <= @head
          AND "Version" >= LEAST(
            COALESCE((SELECT MAX("Version") FROM "GameSteps"
              WHERE "GameId" = @gameId AND ("IsBaseline" OR "IsIrreversible")), 0),
            (SELECT MAX("Version") FROM "GameSnapshots" WHERE "GameId" = @gameId AND "Version" <= @head))
        """;

    internal static async Task<LiveHistory> Read(
        ApplicationDbContext db,
        Guid gameId,
        int head,
        CancellationToken ct = default
    )
    {
        var connection = (NpgsqlConnection)db.Database.GetDbConnection();
        var transaction = db.Database.CurrentTransaction
            ?? throw new InvalidOperationException("Live history reads require an active transaction.");
        await using var batch = new NpgsqlBatch(connection, (NpgsqlTransaction)transaction.GetDbTransaction())
        {
            Timeout = db.Database.GetCommandTimeout() ?? connection.CommandTimeout,
        };
        foreach (var sql in new[] { ReadBoundsSql, ReadStepsSql })
        {
            var command = new NpgsqlBatchCommand(sql);
            command.Parameters.Add(new NpgsqlParameter("gameId", gameId));
            command.Parameters.Add(new NpgsqlParameter("head", head));
            batch.BatchCommands.Add(command);
        }

        await using var reader = await batch.ExecuteReaderAsync(ct);
        await reader.ReadAsync(ct);
        var barrier = reader.GetInt32(0);
        var snapshot = await reader.IsDBNullAsync(1, ct) ? (int?)null : reader.GetInt32(1);
        await reader.NextResultAsync(ct);
        var steps = new Dictionary<int, LiveStep>();
        var physicalSteps = 0;
        while (await reader.ReadAsync(ct))
        {
            var step = new LiveStep(
                reader.GetInt32(0),
                await reader.IsDBNullAsync(1, ct) ? null : reader.GetInt32(1),
                await reader.IsDBNullAsync(2, ct) ? null : reader.GetString(2),
                await reader.IsDBNullAsync(3, ct) ? null : reader.GetString(3),
                await reader.GetFieldValueAsync<string[]>(4, ct),
                reader.GetBoolean(5),
                reader.GetBoolean(6)
            );
            steps.Add(step.Version, step);
            if (step.Version > snapshot)
                physicalSteps++;
        }

        if (head < 0 || barrier > head || snapshot is null || physicalSteps != head - snapshot)
            return new LiveHistory(IsValid: false, barrier, Steps: []);
        return Walk(head, barrier, steps);
    }

    internal HistorySummary GetSummary(int version)
    {
        var checkpoints = new Dictionary<string, int>(StringComparer.Ordinal);
        HistoryAction? action = null;
        foreach (var step in Steps)
        {
            foreach (var tag in step.Checkpoints)
                if (!string.Equals(tag, "undo", StringComparison.Ordinal))
                    checkpoints.TryAdd(tag, step.Version);
            if (action is null && step.Actor is not null && step.Action is not null)
                action = new HistoryAction(step.Version, step.RestoredVersion ?? step.Version, step.Actor, step.Action);
        }
        return new HistorySummary(version, BarrierVersion, checkpoints, action);
    }

    private static LiveHistory Walk(int head, int barrier, Dictionary<int, LiveStep> steps)
    {
        var liveSteps = new List<LiveStep>();
        var version = head;
        while (version > 0 && steps.TryGetValue(version, out var step))
        {
            var sourceVersion = step.RestoredVersion ?? step.Version;
            if (sourceVersion <= 0 || sourceVersion > step.Version || step.Version < barrier)
                break;
            liveSteps.Add(step);
            if (step.Version == barrier)
                return new LiveHistory(IsValid: true, barrier, liveSteps);
            if (barrier == 0 && sourceVersion == 1)
                return new LiveHistory(IsValid: !steps.ContainsKey(0), barrier, liveSteps);
            if (step.IsBaseline || step.IsIrreversible)
                break;
            version = sourceVersion - 1;
        }
        return new LiveHistory(IsValid: head == 0 && !steps.ContainsKey(0), barrier, liveSteps);
    }
}
