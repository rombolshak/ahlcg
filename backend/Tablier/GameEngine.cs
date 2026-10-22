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
    GameRules<TConfiguration, TState, TView> rules,
    IGameHistory<TState> history,
    IHubContext<GameHub, IGameClient> hub,
    IOptions<JsonHubProtocolOptions> hubOptions,
    ILogger<GameEngine<TConfiguration, TState, TView>> logger
) : IGameEngine
#pragma warning restore S2436
    where TState : ISchemaVersioned
{
    private const int MaxAttempts = 3;

    private readonly JsonSerializerOptions _wireOptions = hubOptions.Value.PayloadSerializerOptions;

    public bool IsConfigurationValid(JsonElement configuration) => TryRead(configuration) is not null;

    public async Task Begin(Guid gameId, JsonElement configuration, string owner, CancellationToken ct)
    {
        var read =
            TryRead(configuration)
            ?? throw new ArgumentException("Configuration is not readable.", nameof(configuration));

        var seed = BitConverter.ToUInt64(RandomNumberGenerator.GetBytes(sizeof(ulong)));
        var initial = rules.Configurator.InitializeGame(read, [owner], seed);

        var begun = await history.Begin(gameId, initial, ct);
        if (begun is null)
            LogBeginRefusedHistoryExists(logger, gameId);
        else
            LogHistoryBegun(logger, gameId);
    }

    public async Task<MemberState?> GetMemberState(Guid gameId, string member, CancellationToken ct)
    {
        var stored = await history.LoadCurrent(gameId, ct);
        if (stored is null)
        {
            LogStateRefusedNoHistory(logger, gameId);
            return null;
        }

        var state = stored.State;
        if (!rules.Processor.GetMembers(state).Contains(member))
        {
            LogStateRefusedNotAMember(logger, gameId, member);
            return null;
        }

        var view = ProjectView(state, member);
        var actions = ComputeActionPatches(state, member, view);

        LogStateServed(logger, gameId, member, stored.Version, actions.Count);
        return new MemberState(stored.Version, view, actions);
    }

    public async Task<bool> Execute(Guid gameId, string member, string action, CancellationToken ct)
    {
        for (var attempt = 1; attempt <= MaxAttempts; attempt++)
        {
            var stored = await history.LoadCurrent(gameId, ct);
            if (stored is null)
                return false;

            if (!IsOffered(stored.State, member, action))
            {
                LogActionRejectedNotOffered(logger, gameId, member, action);
                return false;
            }

            var result = rules.Processor.Execute(stored.State, member, action);
            var committed = await history.Append(gameId, stored, result, new PlayerChoice(member, action), ct);
            if (committed is null)
            {
                LogAppendConflict(logger, gameId, stored.Version, attempt);
                continue;
            }

            LogStepCommitted(logger, gameId, member, committed.Version);
            await SendStateChanged(gameId, stored, committed);
            await AdvanceNonPlayerSteps(gameId, committed, ct);
            return true;
        }

        LogActionAbandoned(logger, gameId, member, MaxAttempts);
        return false;
    }

    private bool IsOffered(TState state, string member, string action) =>
        rules.Processor.GetMembersActions(state).TryGetValue(member, out var offered) && offered.Contains(action);

    private bool HoldsActions(TState state) =>
        rules.Processor.GetMembersActions(state).Values.Any(actions => actions.Count > 0);

    private async Task AdvanceNonPlayerSteps(Guid gameId, StoredState<TState> committed, CancellationToken ct)
    {
        var current = committed;
        while (!HoldsActions(current.State))
        {
            var next = await history.Append(gameId, current, rules.Processor.Advance(current.State), choice: null, ct);
            if (next is null)
            {
                LogAdvanceConflict(logger, gameId, current.Version);
                return;
            }

            LogAdvanced(logger, gameId, next.Version);
            await SendStateChanged(gameId, current, next);
            current = next;
        }
    }

    private async Task SendStateChanged(Guid gameId, StoredState<TState> previous, StoredState<TState> next)
    {
        var previousMembers = rules.Processor.GetMembers(previous.State);
        foreach (var member in rules.Processor.GetMembers(next.State))
        {
            var before = previousMembers.Contains(member) ? ProjectView(previous.State, member) : new JsonObject();
            var after = ProjectView(next.State, member);
            var change = new StateChange(
                next.Version,
                before.CreatePatch(after),
                ComputeActionPatches(next.State, member, after)
            );
            await hub.Clients.Group(GameHub.GetMemberGroupName(gameId, member)).StateChanged(change);
        }
    }

    private Dictionary<string, JsonPatch> ComputeActionPatches(TState state, string member, JsonNode view)
    {
        var offered = rules.Processor.GetMembersActions(state).GetValueOrDefault(member) ?? new HashSet<string>();
        return offered.ToDictionary(
            action => action,
            action => view.CreatePatch(ProjectView(rules.Processor.Execute(state, member, action).State, member)),
            StringComparer.Ordinal
        );
    }

    private JsonNode ProjectView(TState state, string member) =>
        JsonSerializer.SerializeToNode(rules.Projector.GetMemberView(state, member), _wireOptions)
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
    private static partial void LogStateRefusedNoHistory(ILogger logger, Guid gameId);

    [LoggerMessage(LogLevel.Information, "State of game {GameId} was not served to user {UserId}: they are not in it")]
    private static partial void LogStateRefusedNotAMember(ILogger logger, Guid gameId, string userId);

    [LoggerMessage(
        LogLevel.Debug,
        "Version {Version} of game {GameId} was served to user {UserId} with {ActionCount} actions"
    )]
    private static partial void LogStateServed(
        ILogger logger,
        Guid gameId,
        string userId,
        int version,
        int actionCount
    );

    [LoggerMessage(LogLevel.Information, "User {UserId} action {Action} was rejected in game {GameId}: not offered")]
    private static partial void LogActionRejectedNotOffered(ILogger logger, Guid gameId, string userId, string action);

    [LoggerMessage(
        LogLevel.Debug,
        "Append after version {Version} of game {GameId} conflicted on attempt {Attempt}; retrying"
    )]
    private static partial void LogAppendConflict(ILogger logger, Guid gameId, int version, int attempt);

    [LoggerMessage(LogLevel.Warning, "User {UserId} action in game {GameId} was abandoned after {Attempts} attempts")]
    private static partial void LogActionAbandoned(ILogger logger, Guid gameId, string userId, int attempts);

    [LoggerMessage(LogLevel.Information, "User {UserId} committed version {Version} of game {GameId}")]
    private static partial void LogStepCommitted(ILogger logger, Guid gameId, string userId, int version);

    [LoggerMessage(LogLevel.Information, "Game {GameId} advanced to version {Version}")]
    private static partial void LogAdvanced(ILogger logger, Guid gameId, int version);

    [LoggerMessage(LogLevel.Debug, "Game {GameId} advance after version {Version} was refused; another writer won")]
    private static partial void LogAdvanceConflict(ILogger logger, Guid gameId, int version);
}
