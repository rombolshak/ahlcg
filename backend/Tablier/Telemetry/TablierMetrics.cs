using System.Diagnostics.Metrics;

namespace Tablier.Telemetry;

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
        GateWaitDuration = meter.CreateHistogram<double>("tablier.session.gate.wait.duration", unit: "s");
        RebuildDuration = meter.CreateHistogram<double>("tablier.session.rebuild.duration", unit: "s");
        PublicationDuration = meter.CreateHistogram<double>("tablier.session.publication.duration", unit: "s");
        SynchronizationDuration = meter.CreateHistogram<double>("tablier.session.synchronization.duration", unit: "s");
        _cacheLookups = meter.CreateCounter<long>("tablier.session.cache.lookups", unit: "{lookup}");
    }

    public Histogram<double> HistoryDuration { get; }

    public Histogram<double> EngineDuration { get; }

    public Histogram<double> RulesDuration { get; }

    public Histogram<double> GateWaitDuration { get; }
    public Histogram<double> RebuildDuration { get; }
    public Histogram<double> PublicationDuration { get; }
    public Histogram<double> SynchronizationDuration { get; }

    public void RecordCacheLookup(bool hit) =>
        _cacheLookups.Add(1, new KeyValuePair<string, object?>("result", hit ? "hit" : "miss"));
}
