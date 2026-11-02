using System.Text.Json;
using Tablier.Engine.History.Rewind;
using Tablier.Games;
using Tablier.Telemetry;

namespace Tablier.Engine;

public sealed class MeteredGameEngine(IGameEngine inner, TablierMetrics metrics, TimeProvider time)
    : MeteredDecorator(metrics.EngineDuration, time),
        IGameEngine
{
    public bool IsConfigurationValid(JsonElement configuration) =>
        Measure("is_configuration_valid", () => inner.IsConfigurationValid(configuration), OkOrRefused);

    public Task Begin(Guid gameId, JsonElement configuration, string owner, CancellationToken ct) =>
        MeasureAsync("begin", () => inner.Begin(gameId, configuration, owner, ct));

    public Task SyncMembers(Guid gameId, CancellationToken ct) =>
        MeasureAsync("sync_members", () => inner.SyncMembers(gameId, ct));

    public Task<MemberState?> GetMemberState(Guid gameId, string member, CancellationToken ct) =>
        MeasureAsync(
            "get_member_state",
            () => inner.GetMemberState(gameId, member, ct),
            state => state is null ? OutcomeRefused : OutcomeOk
        );

    public Task<int?> Execute(Guid gameId, string member, string action, CancellationToken ct) =>
        MeasureAsync(
            "execute",
            () => inner.Execute(gameId, member, action, ct),
            version => version is null ? OutcomeRefused : OutcomeOk
        );

    public Task<RewindTargets?> GetRewindTargets(Guid gameId, string member, CancellationToken ct) =>
        MeasureAsync(
            "get_rewind_targets",
            () => inner.GetRewindTargets(gameId, member, ct),
            result => result is null ? OutcomeRefused : OutcomeOk
        );

    public Task<RewindProposal?> GetRewindProposal(Guid gameId, string member, CancellationToken ct) =>
        MeasureAsync("get_rewind_proposal", () => inner.GetRewindProposal(gameId, member, ct), _ => OutcomeOk);

    public Task<bool> RequestRewind(Guid gameId, string member, int? target, CancellationToken ct) =>
        MeasureAsync("request_rewind", () => inner.RequestRewind(gameId, member, target, ct), OkOrRefused);

    public Task<bool> AnswerRewind(Guid gameId, string member, Guid proposalId, bool approve, CancellationToken ct) =>
        MeasureAsync("answer_rewind", () => inner.AnswerRewind(gameId, member, proposalId, approve, ct), OkOrRefused);

    private static string OkOrRefused(bool accepted) => accepted ? OutcomeOk : OutcomeRefused;
}
