namespace Tablier.Engine.History.Cache;

public sealed class GameHistoryCacheOptions
{
    public const string SectionName = "Tablier:GameHistoryCache";

    public TimeSpan Expiration { get; set; } = TimeSpan.FromHours(1);
}
