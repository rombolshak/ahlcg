namespace Tablier.Engine.History.Cleanup;

public sealed class GameHistoryCleanupOptions
{
    public const string SectionName = "Tablier:GameHistoryCleanup";

    public TimeSpan Interval { get; set; } = TimeSpan.FromHours(1);
}
