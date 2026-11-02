using System.Security.Cryptography;
using System.Text.Json;
using System.Text.Json.Nodes;
using Json.Patch;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Tablier.Contract;
using Tablier.Data;
using Tablier.Engine.History;
using Tablier.Engine.History.Rewind;
using Tablier.Games;

namespace Tablier.Engine;

#pragma warning disable S2436
public sealed partial class GameEngine<TConfiguration, TState, TView>(
    GameRules<TConfiguration, TState, TView> rules,
    IGameHistory<TState> history,
    RewindProposals proposals,
    ApplicationDbContext db,
    IHubContext<GameHub, IGameClient> hub,
    IOptions<JsonHubProtocolOptions> hubOptions,
    ILogger<GameEngine<TConfiguration, TState, TView>> logger
) : IGameEngine
#pragma warning restore S2436
    where TState : ISchemaVersioned
{
    private const int MaxAttempts = 3;

    private readonly record struct MembershipChange(string Member, bool Joined);

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

    public async Task SyncMembers(Guid gameId, CancellationToken ct)
    {
        var conflicts = 0;
        while (conflicts < MaxAttempts)
        {
            var stored = await history.LoadCurrent(gameId, ct);
            if (stored is null)
                return;

            var change = await FindNextMembershipChange(gameId, stored.State, ct);
            if (change is null)
            {
                LogNothingToSync(logger, gameId);
                return;
            }

            var result = change.Value.Joined
                ? rules.Processor.AddMember(stored.State, change.Value.Member)
                : rules.Processor.RemoveMember(stored.State, change.Value.Member);
            var committed = await history.Append(gameId, stored, result, choice: null, ct);
            if (committed is null)
            {
                conflicts++;
                LogAppendConflict(logger, gameId, stored.Version, conflicts);
                continue;
            }

            conflicts = 0;
            await InvalidateProposal(gameId, committed.Version, ct);
            if (change.Value.Joined)
                LogMemberAddedBySync(logger, gameId, change.Value.Member, committed.Version);
            else
                LogMemberRemovedBySync(logger, gameId, change.Value.Member, committed.Version);
            await SendStateChanged(gameId, stored, committed);
            await AdvanceNonPlayerSteps(gameId, committed, ct);
        }

        LogSyncAbandoned(logger, gameId, MaxAttempts);
    }

    public async Task<MemberState?> GetMemberState(Guid gameId, string member, CancellationToken ct)
    {
        await SyncMembers(gameId, ct);

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

    public async Task<int?> Execute(Guid gameId, string member, string action, CancellationToken ct)
    {
        for (var attempt = 1; attempt <= MaxAttempts; attempt++)
        {
            var stored = await history.LoadCurrent(gameId, ct);
            if (stored is null)
                return null;

            if (!IsOffered(stored.State, member, action))
            {
                LogActionRejectedNotOffered(logger, gameId, member, action);
                return null;
            }

            var result = rules.Processor.Execute(stored.State, member, action);
            var committed = await history.Append(gameId, stored, result, new PlayerChoice(member, action), ct);
            if (committed is null)
            {
                LogAppendConflict(logger, gameId, stored.Version, attempt);
                continue;
            }

            LogStepCommitted(logger, gameId, member, committed.Version);
            await InvalidateProposal(gameId, committed.Version, ct);
            await SendStateChanged(gameId, stored, committed);
            await AdvanceNonPlayerSteps(gameId, committed, ct);
            return committed.Version;
        }

        LogActionAbandoned(logger, gameId, member, MaxAttempts);
        return null;
    }

    private async Task<MembershipChange?> FindNextMembershipChange(Guid gameId, TState state, CancellationToken ct)
    {
        var rows = await db
            .GameMembers.AsNoTracking()
            .Where(m => m.GameId == gameId)
            .Select(m => m.UserId)
            .ToListAsync(ct);
        var inState = rules.Processor.GetMembers(state);

        var joiner = rows.Where(row => !inState.Contains(row)).Order(StringComparer.Ordinal).FirstOrDefault();
        if (joiner is not null)
            return new MembershipChange(joiner, Joined: true);

        var leaver = inState.Except(rows).Order(StringComparer.Ordinal).FirstOrDefault();
        return leaver is null ? null : new MembershipChange(leaver, Joined: false);
    }

    private bool IsOffered(TState state, string member, string action) =>
        rules.Processor.GetMembersActions(state).TryGetValue(member, out var offered) && offered.Contains(action);

    private bool HoldsActions(TState state) =>
        rules.Processor.GetMembersActions(state).Values.Any(actions => actions.Count > 0);

    private async Task AdvanceNonPlayerSteps(
        Guid gameId,
        StoredState<TState> committed,
        CancellationToken ct,
        bool checkMembership = false
    )
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
            await InvalidateProposal(gameId, next.Version, ct);
            await SendStateChanged(gameId, current, next, checkMembership);
            current = next;
        }
    }

    private async Task SendStateChanged(
        Guid gameId,
        StoredState<TState> previous,
        StoredState<TState> next,
        bool checkMembership = false
    )
    {
        var previousMembers = rules.Processor.GetMembers(previous.State);
        var currentMembers = rules.Processor.GetMembers(next.State);
        if (checkMembership)
        {
            var rows = await db
                .GameMembers.AsNoTracking()
                .Where(m => m.GameId == gameId)
                .Select(m => m.UserId)
                .ToListAsync();
            currentMembers = currentMembers.Intersect(rows).ToHashSet(StringComparer.Ordinal);
        }
        foreach (var member in currentMembers)
        {
            if (!previousMembers.Contains(member))
            {
                LogChangeSkippedForJoiner(logger, gameId, member, next.Version);
                continue;
            }

            var before = ProjectView(previous.State, member);
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

    public async Task<RewindTargets?> GetRewindTargets(Guid gameId, string member, CancellationToken ct)
    {
        if (!await IsCurrentMember(gameId, member, ct))
            return null;
        var current = await history.LoadCurrent(gameId, ct);
        var path = current is null ? null : await history.GetRewindHistory(gameId, current.Version, ct);
        if (path is null)
        {
            LogRewindRefused(logger, gameId, member, "history-unavailable");
            return null;
        }
        LogRewindRead(logger, gameId, member, path.Head);
        return new RewindTargets(path.Head, path.GetCheckpoints(), path.GetUndoTarget());
    }

    public async Task<RewindProposal?> GetRewindProposal(Guid gameId, string member, CancellationToken ct)
    {
        if (!await IsCurrentMember(gameId, member, ct))
            return null;
        var proposal = await GetCurrentProposal(gameId, ct);
        LogProposalRead(logger, gameId, member, proposal?.Id);
        return proposal;
    }

    public async Task<bool> RequestRewind(Guid gameId, string member, int? target, CancellationToken ct)
    {
        if (!await IsCurrentMember(gameId, member, ct))
            return false;
        var current = await history.LoadCurrent(gameId, ct);
        var path = current is null ? null : await history.GetRewindHistory(gameId, current.Version, ct);
        var selected = target ?? path?.GetUndoTarget();
        if (current is null || path is null)
        {
            LogRewindRefused(logger, gameId, member, "history-unavailable-or-stale-head");
            return false;
        }
        if (selected is null || (target is not null && !path.GetCheckpoints().Any(c => c.Version == target)))
        {
            LogRewindRefused(logger, gameId, member, "invalid-target");
            return false;
        }
        var required = path.GetConsent(selected.Value, member);
        if (required is null)
        {
            LogRewindRefused(logger, gameId, member, "invalid-consent-target");
            return false;
        }
        if (required.Count == 0)
            return await RestoreRewind(gameId, member, current, selected.Value, ct);
        if (await GetCurrentProposal(gameId, ct) is not null)
        {
            LogRewindRefused(logger, gameId, member, "proposal-active");
            return false;
        }
        var proposal = new RewindProposal(
            Guid.NewGuid(),
            current.Version,
            selected.Value,
            member,
            required.Order(StringComparer.Ordinal).ToList(),
            []
        );
        if (!await proposals.Exchange(gameId, expected: null, proposal))
        {
            LogRewindRefused(logger, gameId, member, "proposal-create-conflict");
            return false;
        }
        if (await history.GetRewindHistory(gameId, current.Version, ct) is null)
        {
            await proposals.Exchange(gameId, proposal, replacement: null);
            LogRewindRefused(logger, gameId, member, "stale-head");
            return false;
        }
        LogProposalOpened(logger, gameId, proposal.Id, current.Version);
        await SendProposalChanged(gameId, ct);
        return true;
    }

    public async Task<bool> AnswerRewind(
        Guid gameId,
        string member,
        Guid proposalId,
        bool approve,
        CancellationToken ct
    )
    {
        if (!await IsCurrentMember(gameId, member, ct))
            return false;
        while (true)
        {
            var proposal = await GetCurrentProposal(gameId, ct);
            if (proposal is null || proposal.Id != proposalId || !proposal.Required.Contains(member))
            {
                LogRewindRefused(logger, gameId, member, "proposal-or-voter-invalid");
                return false;
            }
            if (approve && proposal.Approved.Contains(member))
            {
                LogAnswerRepeated(logger, gameId, member, proposalId);
                return true;
            }
            var approved = proposal.Approved.Append(member).Order(StringComparer.Ordinal).ToList();
            var complete = approve && approved.Count == proposal.Required.Count;
            var replacement = !approve || complete ? null : proposal with { Approved = approved };
            if (!await proposals.Exchange(gameId, proposal, replacement))
                continue;
            if (await history.GetRewindHistory(gameId, proposal.Head, ct) is null)
            {
                if (replacement is not null)
                    await proposals.Exchange(gameId, replacement, replacement: null);
                await SendProposalChanged(gameId, ct);
                LogRewindRefused(logger, gameId, member, "stale-head");
                return false;
            }
            LogAnswerRecorded(logger, gameId, member, proposalId, approve ? "approved" : "rejected");
            if (!complete)
            {
                await SendProposalChanged(gameId, ct);
                return true;
            }
            var current = await history.LoadCurrent(gameId, ct);
            if (current is null || current.Version != proposal.Head)
            {
                await SendProposalChanged(gameId, ct);
                LogRewindRefused(logger, gameId, member, "stale-head");
                return false;
            }
            var restored = await RestoreRewind(gameId, member, current, proposal.Target, ct);
            await SendProposalChanged(gameId, ct);
            return restored;
        }
    }

    private async Task<bool> IsCurrentMember(Guid gameId, string member, CancellationToken ct)
    {
        var exists = await db.GameMembers.AsNoTracking().AnyAsync(m => m.GameId == gameId && m.UserId == member, ct);
        if (!exists)
            LogRewindRefusedNotMember(logger, gameId, member);
        return exists;
    }

    private async Task<RewindProposal?> GetCurrentProposal(Guid gameId, CancellationToken ct)
    {
        while (true)
        {
            var proposal = await proposals.Get(gameId);
            if (proposal is null)
                return null;
            if (await history.GetRewindHistory(gameId, proposal.Head, ct) is not null)
                return proposal;
            if (await proposals.Exchange(gameId, proposal, replacement: null))
            {
                LogProposalVoided(logger, gameId, proposal.Id, proposal.Head);
                await SendProposalChanged(gameId, ct);
                return null;
            }
        }
    }

    private async Task InvalidateProposal(Guid gameId, int version, CancellationToken ct)
    {
        while (true)
        {
            var proposal = await proposals.Get(gameId);
            if (proposal is null || proposal.Head >= version)
                return;
            if (!await proposals.Exchange(gameId, proposal, replacement: null))
                continue;
            LogProposalVoided(logger, gameId, proposal.Id, proposal.Head);
            await SendProposalChanged(gameId, ct);
            return;
        }
    }

    private async Task<bool> RestoreRewind(
        Guid gameId,
        string member,
        StoredState<TState> current,
        int target,
        CancellationToken ct
    )
    {
        var restored = await history.Restore(gameId, current, target, ct);
        if (restored is null)
        {
            LogRewindRefused(logger, gameId, member, "restore-conflict-or-target-unavailable");
            return false;
        }
        LogRewindRestored(logger, gameId, member, restored.Version, target);
        await InvalidateProposal(gameId, restored.Version, ct);
        await SendStateChanged(gameId, current, restored, checkMembership: true);
        await AdvanceNonPlayerSteps(gameId, restored, ct, checkMembership: true);
        return true;
    }

    private async Task SendProposalChanged(Guid gameId, CancellationToken ct)
    {
        var members = await db
            .GameMembers.AsNoTracking()
            .Where(m => m.GameId == gameId)
            .Select(m => m.UserId)
            .ToListAsync(ct);
        foreach (var member in members)
            await hub.Clients.Group(GameHub.GetMemberGroupName(gameId, member)).RewindProposalChanged();
    }

    [LoggerMessage(LogLevel.Debug, "Game {GameId} membership already matches its state; nothing to sync")]
    private static partial void LogNothingToSync(ILogger logger, Guid gameId);

    [LoggerMessage(LogLevel.Information, "User {UserId} was added to game {GameId} by sync at version {Version}")]
    private static partial void LogMemberAddedBySync(ILogger logger, Guid gameId, string userId, int version);

    [LoggerMessage(LogLevel.Information, "User {UserId} was removed from game {GameId} by sync at version {Version}")]
    private static partial void LogMemberRemovedBySync(ILogger logger, Guid gameId, string userId, int version);

    [LoggerMessage(LogLevel.Warning, "Membership sync of game {GameId} was abandoned after {Attempts} conflicts")]
    private static partial void LogSyncAbandoned(ILogger logger, Guid gameId, int attempts);

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

    [LoggerMessage(
        LogLevel.Debug,
        "Version {Version} of game {GameId} was not pushed to user {UserId}: they just joined"
    )]
    private static partial void LogChangeSkippedForJoiner(ILogger logger, Guid gameId, string userId, int version);

    [LoggerMessage(LogLevel.Debug, "Game {GameId} advance after version {Version} was refused; another writer won")]
    private static partial void LogAdvanceConflict(ILogger logger, Guid gameId, int version);

    [LoggerMessage(LogLevel.Information, "Rewind operation for user {UserId} in game {GameId} was refused: {Reason}")]
    private static partial void LogRewindRefused(ILogger logger, Guid gameId, string userId, string reason);

    [LoggerMessage(LogLevel.Warning, "Rewind operation for user {UserId} in game {GameId} was refused: not a member")]
    private static partial void LogRewindRefusedNotMember(ILogger logger, Guid gameId, string userId);

    [LoggerMessage(LogLevel.Debug, "Rewind targets at version {Version} of game {GameId} served to user {UserId}")]
    private static partial void LogRewindRead(ILogger logger, Guid gameId, string userId, int version);

    [LoggerMessage(LogLevel.Debug, "Rewind proposal {ProposalId} of game {GameId} served to user {UserId}")]
    private static partial void LogProposalRead(ILogger logger, Guid gameId, string userId, Guid? proposalId);

    [LoggerMessage(LogLevel.Information, "Rewind proposal {ProposalId} opened at version {Version} of game {GameId}")]
    private static partial void LogProposalOpened(ILogger logger, Guid gameId, Guid proposalId, int version);

    [LoggerMessage(LogLevel.Debug, "User {UserId} repeated an answer to proposal {ProposalId} of game {GameId}")]
    private static partial void LogAnswerRepeated(ILogger logger, Guid gameId, string userId, Guid proposalId);

    [LoggerMessage(LogLevel.Information, "User {UserId} {Answer} proposal {ProposalId} of game {GameId}")]
    private static partial void LogAnswerRecorded(
        ILogger logger,
        Guid gameId,
        string userId,
        Guid proposalId,
        string answer
    );

    [LoggerMessage(
        LogLevel.Information,
        "Rewind proposal {ProposalId} at version {Version} of game {GameId} was voided"
    )]
    private static partial void LogProposalVoided(ILogger logger, Guid gameId, Guid proposalId, int version);

    [LoggerMessage(
        LogLevel.Information,
        "User {UserId} restored version {Target} as version {Version} of game {GameId}"
    )]
    private static partial void LogRewindRestored(ILogger logger, Guid gameId, string userId, int version, int target);
}
