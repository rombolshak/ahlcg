using System.Diagnostics.Metrics;

namespace Tablier;

#pragma warning disable MA0048
public enum StepKind
{
    Choice,
    Advance,
    Membership,
}

public enum RejectionReason
{
    NotOffered,
    RetriesExhausted,
}

public enum HistorySource
{
    Cache,
    Store,
}
#pragma warning restore MA0048

public sealed class GameEngineMetrics
{
    public const string MeterName = "Tablier.GameEngine";

    private readonly Counter<long> _steps;
    private readonly Counter<long> _rejected;
    private readonly Counter<long> _refused;
    private readonly Histogram<double> _duration;
    private readonly Counter<long> _loads;

    public GameEngineMetrics(IMeterFactory meterFactory)
    {
        var meter = meterFactory.Create(MeterName);
        _steps = meter.CreateCounter<long>("tablier.steps", unit: "{step}");
        _rejected = meter.CreateCounter<long>("tablier.actions.rejected", unit: "{action}");
        _refused = meter.CreateCounter<long>("tablier.append.refused", unit: "{append}");
        _duration = meter.CreateHistogram<double>("tablier.step.duration", unit: "s");
        _loads = meter.CreateCounter<long>("tablier.game_history.loads", unit: "{load}");
    }

    public void StepCommitted(StepKind kind) =>
        _steps.Add(
            1,
            new KeyValuePair<string, object?>(
                "kind",
                kind switch
                {
                    StepKind.Choice => "choice",
                    StepKind.Advance => "advance",
                    StepKind.Membership => "membership",
                    _ => throw new ArgumentOutOfRangeException(nameof(kind)),
                }
            )
        );

    public void ActionRejected(RejectionReason reason) =>
        _rejected.Add(
            1,
            new KeyValuePair<string, object?>(
                "reason",
                reason switch
                {
                    RejectionReason.NotOffered => "not_offered",
                    RejectionReason.RetriesExhausted => "retries_exhausted",
                    _ => throw new ArgumentOutOfRangeException(nameof(reason)),
                }
            )
        );

    public void AppendRefused() => _refused.Add(1);

    public void ExecuteCompleted(TimeSpan elapsed) => _duration.Record(elapsed.TotalSeconds);

    public void HistoryLoaded(HistorySource source) =>
        _loads.Add(
            1,
            new KeyValuePair<string, object?>(
                "source",
                source switch
                {
                    HistorySource.Cache => "cache",
                    HistorySource.Store => "store",
                    _ => throw new ArgumentOutOfRangeException(nameof(source)),
                }
            )
        );
}
