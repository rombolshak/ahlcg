using System.Text.Json;
using Tablier.Engine.Execution;
using Tablier.Games;
using Tablier.Telemetry;

namespace Tablier.Engine;

internal sealed class MeteredGameEngine(IGameEngine inner, TablierMetrics metrics, TimeProvider time)
    : MeteredDecorator(metrics.EngineDuration, time),
        IGameEngine
{
    public Task<CreateGameResult> Create(
        string owner,
        string idempotencyKey,
        JsonElement configuration,
        CancellationToken ct = default
    ) =>
        MeasureAsync(
            "create",
            () => inner.Create(owner, idempotencyKey, configuration, ct),
            result => result is CreateGameResult.Created ? OutcomeOk : OutcomeRefused
        );

    public Task<JoinGameResult> Join(string member, string code, CancellationToken ct = default) =>
        MeasureAsync(
            "join",
            () => inner.Join(member, code, ct),
            result => result is JoinGameResult.Joined ? OutcomeOk : OutcomeRefused
        );

    public Task SyncMembers(Guid gameId, CancellationToken ct = default) =>
        MeasureAsync("sync_members", () => inner.SyncMembers(gameId, ct));

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
}
