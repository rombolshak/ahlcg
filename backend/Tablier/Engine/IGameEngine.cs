using System.Text.Json;
using Tablier.Games;

namespace Tablier.Engine;

internal interface IGameEngine
{
    bool IsConfigurationValid(JsonElement configuration);

    Task Begin(Guid gameId, JsonElement configuration, string owner, CancellationToken ct = default);

    Task SyncMembers(Guid gameId, CancellationToken ct = default);

    /// <summary>Returns null when the member has no view in the game state.</summary>
    Task<MemberState?> GetMemberState(Guid gameId, string member, CancellationToken ct = default);

    /// <summary>Returns null when the action was not committed and its optimistic result must be discarded.</summary>
    Task<int?> Execute(Guid gameId, string member, string action, CancellationToken ct = default);
}
