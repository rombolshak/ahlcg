using System.Security.Cryptography;
using System.Text.Json;
using Tablier.Contract;

namespace Tablier;

public sealed partial class GameEngine<TConfiguration, TState, TView>(
    IGameConfigurator<TConfiguration, TState> configurator,
    IGameHistory<TState> history,
    ILogger<GameEngine<TConfiguration, TState, TView>> logger
) : IGameEngine
    where TState : ISchemaVersioned
{
    public bool IsReadableConfiguration(JsonElement configuration) => TryRead(configuration) is not null;

    public async Task Begin(Guid gameId, JsonElement configuration, string owner, CancellationToken ct)
    {
        var read =
            TryRead(configuration)
            ?? throw new ArgumentException("Configuration is not readable.", nameof(configuration));

        var seed = BitConverter.ToUInt64(RandomNumberGenerator.GetBytes(sizeof(ulong)));
        var initial = configurator.InitializeGame(read, [owner], seed);

        var begun = await history.Begin(gameId, initial, ct);
        if (begun is null)
            LogBeginRefusedHistoryExists(logger, gameId);
        else
            LogHistoryBegun(logger, gameId);
    }

    private static TConfiguration? TryRead(JsonElement configuration)
    {
        try
        {
            return configuration.Deserialize<TConfiguration>();
        }
        catch (JsonException)
        {
            return default;
        }
    }

    [LoggerMessage(LogLevel.Information, "Game {GameId} began its history")]
    private static partial void LogHistoryBegun(ILogger logger, Guid gameId);

    [LoggerMessage(LogLevel.Debug, "Game {GameId} was not begun: its history already exists")]
    private static partial void LogBeginRefusedHistoryExists(ILogger logger, Guid gameId);
}
