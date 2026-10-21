using System.Security.Cryptography;
using System.Text.Json;
using System.Text.Json.Nodes;
using Json.Patch;
using Microsoft.AspNetCore.SignalR;
using Microsoft.Extensions.Options;
using Tablier.Contract;

namespace Tablier;

#pragma warning disable S2436
public sealed partial class GameEngine<TConfiguration, TState, TView>(
    IGameConfigurator<TConfiguration, TState> configurator,
    IGameStateProcessor<TState> processor,
    IGameViewProjector<TState, TView> projector,
    IGameHistory<TState> history,
    IOptions<JsonHubProtocolOptions> hubOptions,
    ILogger<GameEngine<TConfiguration, TState, TView>> logger
) : IGameEngine
#pragma warning restore S2436
    where TState : ISchemaVersioned
{
    private readonly JsonSerializerOptions _wireOptions = hubOptions.Value.PayloadSerializerOptions;

    public bool IsConfigurationValid(JsonElement configuration) => TryRead(configuration) is not null;

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

    public async Task<MemberSync?> Sync(Guid gameId, string member, CancellationToken ct)
    {
        var stored = await history.LoadCurrent(gameId, ct);
        if (stored is null)
        {
            LogSyncFoundNoHistory(logger, gameId);
            return null;
        }

        var state = stored.State;
        if (!processor.GetMembers(state).Contains(member))
        {
            LogSyncRefusedNotInState(logger, gameId, member);
            return null;
        }

        var view = ProjectView(state, member);
        var offered = processor.GetMembersActions(state).GetValueOrDefault(member) ?? new HashSet<string>();
        var actions = offered.ToDictionary(
            action => action,
            action => view.CreatePatch(ProjectView(processor.Execute(state, member, action).State, member)),
            StringComparer.Ordinal
        );

        LogSynced(logger, gameId, member, stored.Version, actions.Count);
        return new MemberSync(stored.Version, view, actions);
    }

    private JsonNode ProjectView(TState state, string member) =>
        JsonSerializer.SerializeToNode(projector.GetMemberView(state, member), _wireOptions)
        ?? throw new InvalidOperationException("A view cannot be null.");

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

    [LoggerMessage(LogLevel.Warning, "Game {GameId} has no history")]
    private static partial void LogSyncFoundNoHistory(ILogger logger, Guid gameId);

    [LoggerMessage(LogLevel.Information, "User {UserId} was not synced: they are not in the state of game {GameId}")]
    private static partial void LogSyncRefusedNotInState(ILogger logger, Guid gameId, string userId);

    [LoggerMessage(
        LogLevel.Debug,
        "User {UserId} synced to version {Version} of game {GameId} with {ActionCount} actions"
    )]
    private static partial void LogSynced(ILogger logger, Guid gameId, string userId, int version, int actionCount);
}
