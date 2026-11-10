using System.Text.Json;
using Tablier.Games;
using Tablier.Games.State.Coordination;
using Tablier.Telemetry;

namespace Tablier.Engine;

public sealed class MeteredGameEngine(IGameEngine inner, TablierMetrics metrics, TimeProvider time)
    : MeteredDecorator(metrics.EngineDuration, time),
        IGameEngine
{
    public bool IsConfigurationValid(JsonElement configuration) =>
        Measure("is_configuration_valid", () => inner.IsConfigurationValid(configuration), OkOrRefused);

    public Task Begin(Guid gameId, JsonElement configuration, string owner, CancellationToken ct = default) =>
        MeasureAsync("begin", () => inner.Begin(gameId, configuration, owner, ct));

    public Task SyncMembers(Guid gameId, CancellationToken ct = default) =>
        MeasureAsync("sync_members", () => inner.SyncMembers(gameId, ct));

    public Task SyncMembers(GameMutationLease lease, CancellationToken ct = default) =>
        MeasureAsync("sync_members", () => inner.SyncMembers(lease, ct));

    public Task<MemberState?> GetMemberState(Guid gameId, string member, CancellationToken ct = default) =>
        MeasureAsync(
            "get_member_state",
            () => inner.GetMemberState(gameId, member, ct),
            state => state is null ? OutcomeRefused : OutcomeOk
        );

    public Task<int?> Execute(Guid gameId, string member, string action, CancellationToken ct = default) =>
        MeasureAsync(
            "execute",
            () => inner.Execute(gameId, member, action, ct),
            version => version is null ? OutcomeRefused : OutcomeOk
        );

    private static string OkOrRefused(bool accepted) => accepted ? OutcomeOk : OutcomeRefused;
}
