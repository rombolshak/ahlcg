using Tablier.Contract;
using Tablier.Engine.History.Live;
using Tablier.Telemetry;

namespace Tablier.Engine.History;

internal sealed class MeteredGameHistory<TState> : MeteredDecorator, IGameHistory<TState>
    where TState : ISchemaVersioned
{
    private readonly IGameHistory<TState> _inner;

    public MeteredGameHistory(
        [FromKeyedServices("cached")] IGameHistory<TState> inner,
        TablierMetrics metrics,
        TimeProvider time
    )
        : base(metrics.HistoryDuration, time)
    {
        _inner = inner;
    }

    public Task<StoredState<TState>> Begin(Guid gameId, TState initial, CancellationToken ct = default) =>
        MeasureAsync("begin", () => _inner.Begin(gameId, initial, ct), _ => OutcomeOk);

    public Task<StoredState<TState>?> Append(
        Guid gameId,
        StoredState<TState> previous,
        StepResult<TState> result,
        PlayerChoice? choice,
        CancellationToken ct = default
    ) => MeasureAsync("append", () => _inner.Append(gameId, previous, result, choice, ct), OkOr(OutcomeRefused));

    public Task<StoredState<TState>?> LoadCurrent(Guid gameId, CancellationToken ct = default) =>
        MeasureAsync("load_current", () => _inner.LoadCurrent(gameId, ct), OkOr(OutcomeMissing));

    public Task<StoredState<TState>> LoadAt(Guid gameId, int version, CancellationToken ct = default) =>
        MeasureAsync("load_at", () => _inner.LoadAt(gameId, version, ct), _ => OutcomeOk);

    public Task<StoredState<TState>> Rewind(
        Guid gameId,
        int expectedVersion,
        int targetVersion,
        CancellationToken ct = default
    ) => MeasureAsync("rewind", () => _inner.Rewind(gameId, expectedVersion, targetVersion, ct), _ => OutcomeOk);

    public Task<HistorySummary> GetHistorySummary(Guid gameId, int version, CancellationToken ct = default) =>
        MeasureAsync("get_history_summary", () => _inner.GetHistorySummary(gameId, version, ct), _ => OutcomeOk);

    public Task<IReadOnlySet<string>> GetActorsForRange(
        Guid gameId,
        int lowerExclusiveVersion,
        int upperInclusiveVersion,
        CancellationToken ct = default
    ) =>
        MeasureAsync(
            "get_actors_for_range",
            () => _inner.GetActorsForRange(gameId, lowerExclusiveVersion, upperInclusiveVersion, ct),
            _ => OutcomeOk
        );

    private static Func<StoredState<TState>?, string> OkOr(string nullOutcome) =>
        stored => stored is null ? nullOutcome : OutcomeOk;
}
