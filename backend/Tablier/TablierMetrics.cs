using System.Diagnostics.Metrics;

namespace Tablier;

public sealed class TablierMetrics
{
    public const string MeterName = "Tablier";

    private readonly Counter<long> _cacheLookups;

    public TablierMetrics(IMeterFactory meterFactory)
    {
        var meter = meterFactory.Create(MeterName);
        HistoryDuration = meter.CreateHistogram<double>("tablier.history.duration", unit: "s");
        EngineDuration = meter.CreateHistogram<double>("tablier.engine.duration", unit: "s");
        RulesDuration = meter.CreateHistogram<double>("tablier.rules.duration", unit: "s");
        _cacheLookups = meter.CreateCounter<long>("tablier.history.cache.lookups", unit: "{lookup}");
    }

    public Histogram<double> HistoryDuration { get; }

    public Histogram<double> EngineDuration { get; }

    public Histogram<double> RulesDuration { get; }

    public void RecordCacheLookup(bool hit) =>
        _cacheLookups.Add(1, new KeyValuePair<string, object?>("result", hit ? "hit" : "miss"));
}
