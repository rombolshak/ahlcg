using System.Collections.Immutable;
using Tablier.Contract;

namespace Tablier.Engine.History.Live;

#pragma warning disable MA0048
internal sealed record HistoryAction(int Version, int SourceVersion, string Actor, string Action);
#pragma warning restore MA0048

internal sealed record HistorySummary(
    int GameVersion,
    int BarrierVersion,
    IReadOnlyDictionary<string, int> Checkpoints,
    HistoryAction? LastAction
)
{
    public IReadOnlyDictionary<string, int> Checkpoints { get; } =
        Checkpoints.ToImmutableDictionary(StringComparer.Ordinal);

    public static HistorySummary Empty { get; } = new(0, 0, ImmutableDictionary<string, int>.Empty, LastAction: null);

    internal HistorySummary ApplyStep<TState>(StepResult<TState> step, PlayerChoice? choice = null)
    {
        var version = GameVersion + 1;
        var checkpoints = step.IsBarrier ? [] : new Dictionary<string, int>(Checkpoints);
        foreach (var tag in step.Checkpoints.Where(tag => !string.Equals(tag, "undo", StringComparison.Ordinal)))
            checkpoints[tag] = version;

        var action = step.IsBarrier ? null : LastAction;
        if (choice is { } playerChoice)
            action = new HistoryAction(version, version, playerChoice.Member, playerChoice.Action);
        return new HistorySummary(version, step.IsBarrier ? version : BarrierVersion, checkpoints, action);
    }

    public HistorySummary ApplyRewind(HistorySummary destination)
    {
        var version = GameVersion + 1;
        var checkpoints = destination.Checkpoints.ToDictionary(
            pair => pair.Key,
            pair => pair.Value == destination.GameVersion ? version : pair.Value
        );
        var action =
            destination.LastAction is { } lastAction && lastAction.Version == destination.GameVersion
                ? lastAction with
                {
                    Version = version,
                }
                : destination.LastAction;
        return new HistorySummary(
            version,
            destination.GameVersion > 0 && destination.BarrierVersion == destination.GameVersion
                ? version
                : destination.BarrierVersion,
            checkpoints,
            action
        );
    }

    public IReadOnlyDictionary<string, int> GetTargets()
    {
        var targets = Checkpoints
            .Where(pair =>
                pair.Value > 0
                && pair.Value < GameVersion
                && pair.Value >= BarrierVersion
                && !string.Equals(pair.Key, "undo", StringComparison.Ordinal)
            )
            .ToDictionary();
        if (LastAction is { SourceVersion: > 1 } action && action.SourceVersion - 1 >= BarrierVersion)
            targets["undo"] = action.SourceVersion - 1;

        return targets;
    }
}
