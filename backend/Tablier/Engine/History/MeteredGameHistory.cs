using Tablier.Contract;
using Tablier.Engine.History.Rewind;
using Tablier.Telemetry;

namespace Tablier.Engine.History;

public sealed class MeteredGameHistory<TState>(
    [FromKeyedServices("cached")] IGameHistory<TState> inner,
    TablierMetrics metrics,
    TimeProvider time
) : MeteredDecorator(metrics.HistoryDuration, time), IGameHistory<TState>
    where TState : ISchemaVersioned
{
    public Task<StoredState<TState>?> Begin(Guid gameId, TState initial, CancellationToken ct) =>
        MeasureAsync("begin", () => inner.Begin(gameId, initial, ct), OkOr(OutcomeRefused));

    public Task<StoredState<TState>?> Append(
        Guid gameId,
        StoredState<TState> previous,
        StepResult<TState> result,
        PlayerChoice? choice,
        CancellationToken ct
    ) => MeasureAsync("append", () => inner.Append(gameId, previous, result, choice, ct), OkOr(OutcomeRefused));

    public Task<StoredState<TState>?> LoadCurrent(Guid gameId, CancellationToken ct) =>
        MeasureAsync("load_current", () => inner.LoadCurrent(gameId, ct), OkOr(OutcomeMissing));

    public Task<StoredState<TState>?> LoadAt(Guid gameId, int version, CancellationToken ct) =>
        MeasureAsync("load_at", () => inner.LoadAt(gameId, version, ct), OkOr(OutcomeMissing));

    public Task<RewindHistory?> GetRewindHistory(Guid gameId, int expectedHead, CancellationToken ct) =>
        MeasureAsync(
            "rewind_history",
            () => inner.GetRewindHistory(gameId, expectedHead, ct),
            result => result is null ? OutcomeRefused : OutcomeOk
        );

    public Task<StoredState<TState>?> Restore(
        Guid gameId,
        StoredState<TState> previous,
        int targetVersion,
        CancellationToken ct
    ) => MeasureAsync("restore", () => inner.Restore(gameId, previous, targetVersion, ct), OkOr(OutcomeRefused));

    private static Func<StoredState<TState>?, string> OkOr(string nullOutcome) =>
        stored => stored is null ? nullOutcome : OutcomeOk;
}
