using System.Text.Json;

namespace Tablier;

public sealed class MeteredGameEngine(IGameEngine inner, TablierMetrics metrics, TimeProvider time) : IGameEngine
{
    public bool IsConfigurationValid(JsonElement configuration)
    {
        var started = time.GetTimestamp();
        var outcome = TablierMetrics.OutcomeError;
        try
        {
            var valid = inner.IsConfigurationValid(configuration);
            outcome = valid ? TablierMetrics.OutcomeOk : TablierMetrics.OutcomeRefused;
            return valid;
        }
        finally
        {
            metrics.RecordEngine("is_configuration_valid", outcome, time.GetElapsedTime(started));
        }
    }

    public Task Begin(Guid gameId, JsonElement configuration, string owner, CancellationToken ct) =>
        Measure("begin", () => inner.Begin(gameId, configuration, owner, ct));

    public Task SyncMembers(Guid gameId, CancellationToken ct) =>
        Measure("sync_members", () => inner.SyncMembers(gameId, ct));

    public async Task<MemberState?> GetMemberState(Guid gameId, string member, CancellationToken ct)
    {
        var started = time.GetTimestamp();
        var outcome = TablierMetrics.OutcomeError;
        try
        {
            var state = await inner.GetMemberState(gameId, member, ct);
            outcome = state is null ? TablierMetrics.OutcomeRefused : TablierMetrics.OutcomeOk;
            return state;
        }
        finally
        {
            metrics.RecordEngine("get_member_state", outcome, time.GetElapsedTime(started));
        }
    }

    public async Task<bool> Execute(Guid gameId, string member, string action, CancellationToken ct)
    {
        var started = time.GetTimestamp();
        var outcome = TablierMetrics.OutcomeError;
        try
        {
            var executed = await inner.Execute(gameId, member, action, ct);
            outcome = executed ? TablierMetrics.OutcomeOk : TablierMetrics.OutcomeRefused;
            return executed;
        }
        finally
        {
            metrics.RecordEngine("execute", outcome, time.GetElapsedTime(started));
        }
    }

    private async Task Measure(string method, Func<Task> call)
    {
        var started = time.GetTimestamp();
        var outcome = TablierMetrics.OutcomeError;
        try
        {
            await call();
            outcome = TablierMetrics.OutcomeOk;
        }
        finally
        {
            metrics.RecordEngine(method, outcome, time.GetElapsedTime(started));
        }
    }
}
