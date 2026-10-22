namespace Tablier;

public static class GameHistoryCacheKeys
{
    public static string GetCurrentKey(Guid gameId) => $"tablier:game:{gameId}:current";
}
