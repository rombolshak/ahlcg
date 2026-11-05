using System.Text.Json;
using Tablier.Games;
using Tablier.Games.State.Coordination;

namespace Tablier.Engine;

public interface IGameEngine
{
    bool IsConfigurationValid(JsonElement configuration);

    Task Begin(Guid gameId, JsonElement configuration, string owner, CancellationToken ct = default);

    Task SyncMembers(Guid gameId, CancellationToken ct = default);

    Task SyncMembers(GameMutationLease lease, CancellationToken ct = default);

    Task<MemberState?> GetMemberState(Guid gameId, string member, CancellationToken ct = default);

    Task<int?> Execute(Guid gameId, string member, string action, CancellationToken ct = default);
}
