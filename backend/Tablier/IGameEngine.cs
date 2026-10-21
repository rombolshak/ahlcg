using System.Text.Json;

namespace Tablier;

public interface IGameEngine
{
    bool IsConfigurationValid(JsonElement configuration);

    Task Begin(Guid gameId, JsonElement configuration, string owner, CancellationToken ct);

    Task<MemberSync?> Sync(Guid gameId, string member, CancellationToken ct);
}
