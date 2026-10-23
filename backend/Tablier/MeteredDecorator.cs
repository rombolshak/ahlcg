using System.Diagnostics.Metrics;

namespace Tablier;

public abstract class MeteredDecorator(Histogram<double> duration, TimeProvider time)
{
    protected const string OutcomeOk = "ok";
    protected const string OutcomeRefused = "refused";
    protected const string OutcomeMissing = "missing";
    protected const string OutcomeError = "error";

    protected T Measure<T>(string method, Func<T> call) => Measure(method, call, _ => OutcomeOk);

    protected T Measure<T>(string method, Func<T> call, Func<T, string> getOutcome)
    {
        var started = time.GetTimestamp();
        var outcome = OutcomeError;
        try
        {
            var result = call();
            outcome = getOutcome(result);
            return result;
        }
        finally
        {
            Record(method, outcome, started);
        }
    }

    protected async Task MeasureAsync(string method, Func<Task> call)
    {
        var started = time.GetTimestamp();
        var outcome = OutcomeError;
        try
        {
            await call();
            outcome = OutcomeOk;
        }
        finally
        {
            Record(method, outcome, started);
        }
    }

    protected async Task<T> MeasureAsync<T>(string method, Func<Task<T>> call, Func<T, string> getOutcome)
    {
        var started = time.GetTimestamp();
        var outcome = OutcomeError;
        try
        {
            var result = await call();
            outcome = getOutcome(result);
            return result;
        }
        finally
        {
            Record(method, outcome, started);
        }
    }

    private void Record(string method, string outcome, long started) =>
        duration.Record(
            time.GetElapsedTime(started).TotalSeconds,
            new KeyValuePair<string, object?>("method", method),
            new KeyValuePair<string, object?>("outcome", outcome)
        );
}
