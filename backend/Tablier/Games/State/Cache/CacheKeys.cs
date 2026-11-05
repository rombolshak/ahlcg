namespace Tablier.Games.State.Cache;

public static class CacheKeys
{
    public static string GetGameStateKey(Guid gameId) => $"tablier:game:{gameId}:current";
}
