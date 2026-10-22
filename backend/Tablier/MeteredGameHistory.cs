using Tablier.Contract;

namespace Tablier;

public sealed class MeteredGameHistory<TState>(
    [FromKeyedServices("cached")] IGameHistory<TState> inner,
    TablierMetrics metrics,
    TimeProvider time
) : IGameHistory<TState>
    where TState : ISchemaVersioned
{
    public Task<StoredState<TState>?> Begin(Guid gameId, TState initial, CancellationToken ct) =>
        Measure("begin", TablierMetrics.OutcomeRefused, () => inner.Begin(gameId, initial, ct));

    public Task<StoredState<TState>?> Append(
        Guid gameId,
        StoredState<TState> previous,
        StepResult<TState> result,
        PlayerChoice? choice,
        CancellationToken ct
    ) => Measure("append", TablierMetrics.OutcomeRefused, () => inner.Append(gameId, previous, result, choice, ct));

    public Task<StoredState<TState>?> LoadCurrent(Guid gameId, CancellationToken ct) =>
        Measure("load_current", TablierMetrics.OutcomeMissing, () => inner.LoadCurrent(gameId, ct));

    public Task<StoredState<TState>?> LoadAt(Guid gameId, int version, CancellationToken ct) =>
        Measure("load_at", TablierMetrics.OutcomeMissing, () => inner.LoadAt(gameId, version, ct));

    private async Task<StoredState<TState>?> Measure(
        string method,
        string nullOutcome,
        Func<Task<StoredState<TState>?>> call
    )
    {
        var started = time.GetTimestamp();
        var outcome = TablierMetrics.OutcomeError;
        try
        {
            var stored = await call();
            outcome = stored is null ? nullOutcome : TablierMetrics.OutcomeOk;
            return stored;
        }
        finally
        {
            metrics.RecordHistory(method, outcome, time.GetElapsedTime(started));
        }
    }
}
