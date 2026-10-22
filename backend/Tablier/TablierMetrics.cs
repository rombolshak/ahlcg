using System.Diagnostics.Metrics;

namespace Tablier;

public sealed class TablierMetrics
{
    public const string MeterName = "Tablier";

    public const string OutcomeOk = "ok";
    public const string OutcomeRefused = "refused";
    public const string OutcomeMissing = "missing";
    public const string OutcomeError = "error";

    private readonly Histogram<double> _historyDuration;
    private readonly Counter<long> _cacheLookups;
    private readonly Histogram<double> _engineDuration;
    private readonly Histogram<double> _rulesDuration;

    public TablierMetrics(IMeterFactory meterFactory)
    {
        var meter = meterFactory.Create(MeterName);
        _historyDuration = meter.CreateHistogram<double>("tablier.history.duration", unit: "s");
        _cacheLookups = meter.CreateCounter<long>("tablier.history.cache.lookups", unit: "{lookup}");
        _engineDuration = meter.CreateHistogram<double>("tablier.engine.duration", unit: "s");
        _rulesDuration = meter.CreateHistogram<double>("tablier.rules.duration", unit: "s");
    }

    public void RecordHistory(string method, string outcome, TimeSpan elapsed) =>
        _historyDuration.Record(
            elapsed.TotalSeconds,
            new KeyValuePair<string, object?>("method", method),
            new KeyValuePair<string, object?>("outcome", outcome)
        );

    public void RecordCacheLookup(bool hit) =>
        _cacheLookups.Add(1, new KeyValuePair<string, object?>("result", hit ? "hit" : "miss"));

    public void RecordEngine(string method, string outcome, TimeSpan elapsed) =>
        _engineDuration.Record(
            elapsed.TotalSeconds,
            new KeyValuePair<string, object?>("method", method),
            new KeyValuePair<string, object?>("outcome", outcome)
        );

    public void RecordRules(string method, TimeSpan elapsed) =>
        _rulesDuration.Record(elapsed.TotalSeconds, new KeyValuePair<string, object?>("method", method));
}
