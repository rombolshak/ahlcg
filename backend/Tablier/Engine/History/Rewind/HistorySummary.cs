using System.Collections.Immutable;

namespace Tablier.Engine.History.Rewind;

public sealed record HistorySummary
{
    public HistorySummary(
        int gameVersion,
        int barrierVersion,
        IReadOnlyDictionary<string, int> checkpoints,
        HistoryAction? lastAction
    )
    {
        GameVersion = gameVersion;
        BarrierVersion = barrierVersion;
        Checkpoints = checkpoints.ToImmutableDictionary(StringComparer.Ordinal);
        LastAction = lastAction;
    }

    public int GameVersion { get; init; }
    public int BarrierVersion { get; init; }
    public ImmutableDictionary<string, int> Checkpoints { get; init; }
    public HistoryAction? LastAction { get; init; }

    public static HistorySummary Empty { get; } = new(0, 0, ImmutableDictionary<string, int>.Empty, lastAction: null);

    public HistorySummary ApplyStep(StepMetadata step)
    {
        if (step.Version != GameVersion + 1)
            throw new InvalidOperationException("Step metadata must immediately follow the summary.");
        if (step.Checkpoints.Contains("undo", StringComparer.Ordinal))
            throw new InvalidOperationException("The undo checkpoint is reserved for the engine.");

        var checkpoints = step.IsBarrier
            ? new Dictionary<string, int>(StringComparer.Ordinal)
            : Checkpoints.ToDictionary(StringComparer.Ordinal);
        foreach (var checkpointId in step.Checkpoints)
            checkpoints[checkpointId] = step.Version;
        var lastAction = LastAction;
        if (step.Actor is not null)
            lastAction = new HistoryAction(step.Version, step.Actor);
        else if (step.IsBarrier)
            lastAction = null;
        return new HistorySummary(
            step.Version,
            step.IsBarrier ? step.Version : BarrierVersion,
            checkpoints,
            lastAction
        );
    }

    public HistorySummary ApplyRewind(int newVersion)
    {
        if (GameVersion == 0 || newVersion <= GameVersion + 1)
            throw new InvalidOperationException("A rewind destination must precede the previous physical head.");

        var checkpoints = Checkpoints.ToDictionary(
            pair => pair.Key,
            pair => pair.Value == GameVersion ? newVersion : pair.Value,
            StringComparer.Ordinal
        );
        return this with
        {
            GameVersion = newVersion,
            Checkpoints = checkpoints.ToImmutableDictionary(StringComparer.Ordinal),
        };
    }

    public IReadOnlyList<HistoryTarget> GetTargets()
    {
        var targets = Checkpoints
            .Where(pair => pair.Value > 0 && pair.Value >= BarrierVersion && pair.Value < GameVersion)
            .Select(pair => new HistoryTarget(pair.Key, pair.Value))
            .ToList();
        if (LastAction is not null)
        {
            var destinationVersion = LastAction.Version - 1;
            if (destinationVersion > 0 && destinationVersion >= BarrierVersion && destinationVersion < GameVersion)
                targets.Add(new HistoryTarget("undo", destinationVersion));
        }
        return targets;
    }
}
