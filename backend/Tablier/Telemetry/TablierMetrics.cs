using System.Diagnostics.Metrics;

namespace Tablier.Telemetry;

public sealed class TablierMetrics
{
    public const string MeterName = "Tablier";

    public TablierMetrics(IMeterFactory meterFactory)
    {
        var meter = meterFactory.Create(MeterName);
        HistoryDuration = meter.CreateHistogram<double>("tablier.history.duration", unit: "s");
        EngineDuration = meter.CreateHistogram<double>("tablier.engine.duration", unit: "s");
        RulesDuration = meter.CreateHistogram<double>("tablier.rules.duration", unit: "s");
    }

    public Histogram<double> HistoryDuration { get; }

    public Histogram<double> EngineDuration { get; }

    public Histogram<double> RulesDuration { get; }
}
