namespace Tablier.Engine.History.Rewind;

#pragma warning disable MA0048
public sealed record UndoTarget(int Version, string Actor);

public sealed record HistoryMetadata(
    int Version,
    string? Actor,
    string? Checkpoint,
    bool IsBarrier,
    int? RestoredVersion
);
#pragma warning restore MA0048

public sealed record RewindMetadata(
    int GameVersion,
    int Boundary,
    IReadOnlyDictionary<string, int> Checkpoints,
    UndoTarget? Undo
)
{
    public static RewindMetadata Empty { get; } =
        new(0, 0, new Dictionary<string, int>(StringComparer.Ordinal), Undo: null);

    public RewindMetadata Apply(HistoryMetadata step)
    {
        if (step.RestoredVersion is not null || step.Version != GameVersion + 1)
            throw new InvalidOperationException("Restores and discontinuous metadata require reconstruction.");

        var boundary = step.IsBarrier ? step.Version : Boundary;
        var checkpoints = Checkpoints.Where(pair => pair.Value >= boundary).ToDictionary(StringComparer.Ordinal);
        if (step.Checkpoint is not null)
            checkpoints[step.Checkpoint] = step.Version;

        var undo = step.Actor is null ? Undo : new UndoTarget(step.Version - 1, step.Actor);
        if (undo is not null && (undo.Version <= 0 || undo.Version < boundary))
            undo = null;
        return new RewindMetadata(step.Version, boundary, checkpoints, undo);
    }
}
