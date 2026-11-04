namespace Tablier.Games.State.Cache;

public sealed class GameStateCacheOptions
{
    public const string SectionName = "Tablier:GameHistoryCache";

    public TimeSpan Expiration { get; set; } = TimeSpan.FromHours(1);
}
