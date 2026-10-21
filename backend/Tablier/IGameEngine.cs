using System.Text.Json;

namespace Tablier;

public interface IGameEngine
{
    bool IsReadableConfiguration(JsonElement configuration);

    Task Begin(Guid gameId, JsonElement configuration, string owner, CancellationToken ct);
}
