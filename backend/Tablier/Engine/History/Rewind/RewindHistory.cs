namespace Tablier.Engine.History.Rewind;

#pragma warning disable MA0048
public sealed record RewindStep(int Version, string? Actor, string? Checkpoint, bool IsBarrier, int? RestoredVersion);

public sealed record RewindCheckpoint(int Version, string Tag);
#pragma warning restore MA0048

public sealed class RewindHistory
{
    private readonly List<RewindStep> path;

    private RewindHistory(int head, List<RewindStep> path)
    {
        Head = head;
        this.path = path;
    }

    public int Head { get; }

    public IReadOnlyList<RewindCheckpoint> GetCheckpoints() =>
        path.Where(s => s.Version != Head && s.Checkpoint is not null)
            .Select(s => new RewindCheckpoint(s.Version, s.Checkpoint!))
            .ToList();

    public int? GetUndoTarget()
    {
        for (var i = 0; i < path.Count - 1; i++)
            if (path[i].Actor is not null && !path[i].IsBarrier)
                return path[i + 1].Version;
        return null;
    }

    public IReadOnlySet<string>? GetConsent(int target, string requester)
    {
        var index = path.FindIndex(s => s.Version == target);
        if (index <= 0)
            return null;
        return path.Take(index)
            .Where(s => s.Actor is not null && s.Actor != requester)
            .Select(s => s.Actor!)
            .ToHashSet(StringComparer.Ordinal);
    }

    public static RewindHistory? Create(int head, IReadOnlyList<RewindStep> steps, bool hasInitial)
    {
        var byVersion = steps.ToDictionary(s => s.Version);
        var livePath = new List<RewindStep>();
        var version = head;
        while (true)
        {
            var representation = version;
            while (version != 0 && byVersion.TryGetValue(version, out var alias) && alias.RestoredVersion is int source)
            {
                if (source < 0 || source >= version)
                    return null;
                version = source;
            }
            if (version == 0)
            {
                if (!hasInitial)
                    return null;
                livePath.Add(
                    new RewindStep(
                        representation,
                        Actor: null,
                        Checkpoint: null,
                        IsBarrier: false,
                        RestoredVersion: null
                    )
                );
                break;
            }
            if (!byVersion.TryGetValue(version, out var step))
                return null;
            livePath.Add(step with { Version = representation });
            if (step.IsBarrier)
                break;
            version--;
        }
        return new RewindHistory(head, livePath);
    }
}
