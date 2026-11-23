using Microsoft.EntityFrameworkCore;
using Tablier.Data;

namespace Tablier.Engine.History.Live;

internal sealed record LiveHistory(bool IsValid, int BarrierVersion, IReadOnlyList<LiveStep> Steps)
{
    internal static async Task<LiveHistory> Read(
        ApplicationDbContext db,
        Guid gameId,
        int head,
        CancellationToken ct = default
    )
    {
        if (db.Database.CurrentTransaction is null)
            throw new InvalidOperationException("Live history reads require an active transaction.");

        var bounds = await db
            .Games.Where(game => game.Id == gameId)
            .Select(game => new
            {
                Barrier = db.GameSteps.Where(step => step.GameId == game.Id && (step.IsBaseline || step.IsIrreversible))
                    .Max(step => (int?)step.Version)
                    ?? 0,
                Snapshot = db
                    .GameSnapshots.Where(snapshot => snapshot.GameId == game.Id && snapshot.Version <= head)
                    .Max(snapshot => (int?)snapshot.Version),
            })
            .SingleOrDefaultAsync(ct);
        var barrier = bounds?.Barrier ?? 0;
        var snapshot = bounds?.Snapshot;
        if (head < 0 || barrier > head || snapshot is null)
            return new LiveHistory(IsValid: false, barrier, Steps: []);

        var lowerVersion = Math.Min(barrier, snapshot.Value);
        var steps = await db
            .GameSteps.Where(step => step.GameId == gameId && step.Version >= lowerVersion && step.Version <= head)
            .Select(step => new LiveStep(
                step.Version,
                step.RestoredVersion,
                step.Actor,
                step.Action,
                step.Checkpoints,
                step.IsBaseline || step.IsIrreversible
            ))
            .ToDictionaryAsync(step => step.Version, ct);
        if (steps.Values.Count(step => step.Version > snapshot.Value) != head - snapshot.Value)
            return new LiveHistory(IsValid: false, barrier, Steps: []);
        return Walk(head, barrier, steps);
    }

    internal HistorySummary GetSummary(int version)
    {
        var checkpoints = new Dictionary<string, int>(StringComparer.Ordinal);
        HistoryAction? action = null;
        foreach (var step in Steps)
        {
            foreach (var tag in step.Checkpoints.Where(tag => !string.Equals(tag, "undo", StringComparison.Ordinal)))
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
            if (step.IsBarrier)
                break;
            version = sourceVersion - 1;
        }
        return new LiveHistory(IsValid: head == 0 && !steps.ContainsKey(0), barrier, liveSteps);
    }
}
