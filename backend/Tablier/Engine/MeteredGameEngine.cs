using System.Text.Json;
using Tablier.Games;
using Tablier.Telemetry;

namespace Tablier.Engine;

internal sealed class MeteredGameEngine : MeteredDecorator, IGameEngine
{
    private readonly IGameEngine _inner;

    public MeteredGameEngine(IGameEngine inner, TablierMetrics metrics, TimeProvider time)
        : base(metrics.EngineDuration, time)
    {
        _inner = inner;
    }

    public bool IsConfigurationValid(JsonElement configuration) =>
        Measure("is_configuration_valid", () => _inner.IsConfigurationValid(configuration), OkOrRefused);

    public Task Begin(Guid gameId, JsonElement configuration, string owner, CancellationToken ct = default) =>
        MeasureAsync("begin", () => _inner.Begin(gameId, configuration, owner, ct));

    public Task SyncMembers(Guid gameId, CancellationToken ct = default) =>
        MeasureAsync("sync_members", () => _inner.SyncMembers(gameId, ct));

    public Task<MemberState?> GetMemberState(Guid gameId, string member, CancellationToken ct = default) =>
        MeasureAsync(
            "get_member_state",
            () => _inner.GetMemberState(gameId, member, ct),
            state => state is null ? OutcomeRefused : OutcomeOk
        );

    public Task<int?> Execute(Guid gameId, string member, string action, CancellationToken ct = default) =>
        MeasureAsync(
            "execute",
            () => _inner.Execute(gameId, member, action, ct),
            version => version is null ? OutcomeRefused : OutcomeOk
        );

    private static string OkOrRefused(bool accepted) => accepted ? OutcomeOk : OutcomeRefused;
}
