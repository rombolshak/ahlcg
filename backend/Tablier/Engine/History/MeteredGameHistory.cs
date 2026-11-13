using Tablier.Contract;
using Tablier.Telemetry;

namespace Tablier.Engine.History;

public sealed class MeteredGameHistory<TState>(
    [FromKeyedServices("cached")] IGameHistory<TState> inner,
    TablierMetrics metrics,
    TimeProvider time
) : MeteredDecorator(metrics.HistoryDuration, time), IGameHistory<TState>
    where TState : ISchemaVersioned
{
    public Task<StoredState<TState>?> Begin(Guid gameId, TState initial, CancellationToken ct = default) =>
        MeasureAsync("begin", () => inner.Begin(gameId, initial, ct), OkOr(OutcomeRefused));

    public Task<StoredState<TState>?> Append(
        Guid gameId,
        StoredState<TState> current,
        StepResult<TState> result,
        PlayerChoice? choice,
        CancellationToken ct = default
    ) => MeasureAsync("append", () => inner.Append(gameId, current, result, choice, ct), OkOr(OutcomeRefused));

    public Task<StoredState<TState>?> LoadCurrent(Guid gameId, CancellationToken ct = default) =>
        MeasureAsync("load_current", () => inner.LoadCurrent(gameId, ct), OkOr(OutcomeMissing));

    public Task<StoredState<TState>?> LoadAt(Guid gameId, int version, CancellationToken ct = default) =>
        MeasureAsync("load_at", () => inner.LoadAt(gameId, version, ct), OkOr(OutcomeMissing));

    public Task<StoredState<TState>?> Restore(
        Guid gameId,
        StoredState<TState> current,
        int targetVersion,
        CancellationToken ct = default
    ) => MeasureAsync("restore", () => inner.Restore(gameId, current, targetVersion, ct), OkOr(OutcomeRefused));

    private static Func<StoredState<TState>?, string> OkOr(string nullOutcome) =>
        stored => stored is null ? nullOutcome : OutcomeOk;
}
