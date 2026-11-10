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
using Tablier.Games.State.Coordination;
using Tablier.Games.State.Models;
using Tablier.Telemetry;

namespace Tablier.Engine;

#pragma warning disable S2436
public sealed partial class GameEngine<TConfiguration, TState, TView>(
    GameRules<TConfiguration, TState, TView> rules,
    IGameHistory<TState> history,
    ApplicationDbContext db,
    IHubContext<GameHub, IGameClient> hub,
    IOptions<JsonHubProtocolOptions> hubOptions,
    GameAdmission admission,
    GameMutationRegistry registry,
    IGameStateStore<TState> states,
    TablierMetrics metrics,
    TimeProvider time,
    ILogger<GameEngine<TConfiguration, TState, TView>> logger
) : IGameEngine
#pragma warning restore S2436
    where TState : ISchemaVersioned
{
    private readonly JsonSerializerOptions _wireOptions = hubOptions.Value.PayloadSerializerOptions;

    public bool IsConfigurationValid(JsonElement configuration)
    {
        var readable = TryRead(configuration) is not null;
        if (!readable)
            LogConfigurationRefused(logger);
        return readable;
    }

    public async Task Begin(Guid gameId, JsonElement configuration, string owner, CancellationToken ct = default)
    {
        using var lease = await admission.EnterMember(gameId, owner, ct);
        if (lease is null)
            return;
        var read =
            TryRead(configuration)
            ?? throw new ArgumentException("Configuration is not readable.", nameof(configuration));
        var seed = BitConverter.ToUInt64(RandomNumberGenerator.GetBytes(sizeof(ulong)));
        var begun = await history.Begin(gameId, rules.Configurator.InitializeGame(read, [owner], seed), ct);
        LogBegin(logger, gameId, begun is not null);
        var state = await states.Load(lease, ct);
        if (state is not null)
            await Advance(lease, state, ct);
    }

    public async Task SyncMembers(Guid gameId, CancellationToken ct = default)
    {
        if (!await db.Games.AnyAsync(g => g.Id == gameId, ct))
        {
            LogRefused(logger, gameId, "missing_game");
            return;
        }
        using var lease = await registry.Acquire(gameId, ct);
        await SyncMembers(lease, ct);
    }

    public async Task SyncMembers(GameMutationLease lease, CancellationToken ct = default)
    {
        var state = await states.Load(lease, ct);
        if (state is null)
            return;
        var members = await db
            .GameMembers.AsNoTracking()
            .Where(m => m.GameId == lease.GameId)
            .Select(m => m.UserId)
            .ToListAsync(ct);
        while (true)
        {
            var inGame = rules.Processor.GetMembers(state.Game);
            var joiner = members.Except(inGame, StringComparer.Ordinal).Order(StringComparer.Ordinal).FirstOrDefault();
            var leaver = inGame.Except(members, StringComparer.Ordinal).Order(StringComparer.Ordinal).FirstOrDefault();
            if (joiner is null && leaver is null)
                break;
            var result = joiner is not null
                ? rules.Processor.AddMember(state.Game, joiner)
                : rules.Processor.RemoveMember(state.Game, leaver!);
            var committed = await Commit(lease, state, result, choice: null, ct);
            if (committed is null || lease.IsDirty)
                return;
            state = await Advance(lease, committed, ct);
            if (lease.IsDirty)
                return;
        }
        state = await Advance(lease, state, ct);
        if (!lease.IsDirty)
            await RefreshEngine(lease, state, ct);
        LogSynced(logger, lease.GameId);
    }

    public async Task<MemberState?> GetMemberState(Guid gameId, string member, CancellationToken ct = default)
    {
        using var lease = await admission.EnterMember(gameId, member, ct);
        if (lease is null)
            return null;
        await SyncMembers(lease, ct);
        var state = await states.Load(lease, ct);
        if (state is null || !state.Engine.Members.ContainsKey(member))
        {
            LogRefused(logger, gameId, "missing_state");
            return null;
        }
        LogServed(logger, gameId, member, state.Version);
        return new MemberState(Project(state, member), ComputeActionPatches(state.Game, member));
    }

    public async Task<int?> Execute(Guid gameId, string member, string action, CancellationToken ct = default)
    {
        using var lease = await admission.EnterMember(gameId, member, ct);
        if (lease is null)
            return null;
        await SyncMembers(lease, ct);
        var state = await states.Load(lease, ct);
        if (state is null || !IsOffered(state.Game, member, action))
        {
            LogRefused(logger, gameId, "not_offered");
            return null;
        }
        var committed = await Commit(
            lease,
            state,
            rules.Processor.Execute(state.Game, member, action),
            new PlayerChoice(member, action),
            ct
        );
        if (committed is null)
            return null;
        var version = committed.Engine.GameVersion;
        if (!lease.IsDirty)
            await Advance(lease, committed, ct);
        return version;
    }

    private async Task<GameState<TState>?> Commit(
        GameMutationLease lease,
        GameState<TState> previous,
        StepResult<TState> result,
        PlayerChoice? choice,
        CancellationToken ct = default
    )
    {
        StoredState<TState>? committed;
        try
        {
            committed = await history.Append(
                lease.GameId,
                new StoredState<TState>(previous.Engine.GameVersion, previous.Game),
                result,
                choice,
                ct
            );
        }
        catch (Exception exception)
        {
            return await RecoverUnknownCommit(lease, previous, result, choice, exception);
        }
        if (committed is null)
        {
            lease.IsDirty = true;
            await states.Load(lease, ct);
            LogRefused(logger, lease.GameId, "head_conflict");
            return null;
        }
        lease.IsDirty = true;
        var metadata = previous.Engine.Rewind.Apply(
            new HistoryMetadata(
                committed.Version,
                choice?.Member,
                result.Checkpoint,
                result.IsBaseline || result.IsIrreversible,
                RestoredVersion: null
            )
        );
        var engine = await states.ReadEngine(lease.GameId, committed.Version, metadata, ct);
        var next = previous with { Version = previous.Version + 1, Engine = engine, Game = committed.State };
        if (await states.Install(lease, previous, next, ct))
            await Publish(lease.GameId, previous, next);
        LogCommitted(logger, lease.GameId, committed.Version);
        return next;
    }

    private async Task<GameState<TState>?> RecoverUnknownCommit(
        GameMutationLease lease,
        GameState<TState> previous,
        StepResult<TState> result,
        PlayerChoice? choice,
        Exception exception
    )
    {
        lease.IsDirty = true;
        LogUnknownCommit(logger, lease.GameId, previous.Engine.GameVersion + 1, exception);
        var recovered = await states.Load(lease, CancellationToken.None);
        var step = await db
            .GameSteps.AsNoTracking()
            .SingleOrDefaultAsync(
                s => s.GameId == lease.GameId && s.Version == previous.Engine.GameVersion + 1,
                CancellationToken.None
            );
        if (
            recovered is not null
            && recovered.Engine.GameVersion == previous.Engine.GameVersion + 1
            && step is not null
            && step.Actor == choice?.Member
            && step.Action == choice?.Action
            && step.RestoredVersion is null
            && step.Checkpoint == result.Checkpoint
            && step.IsBaseline == result.IsBaseline
            && step.IsIrreversible == result.IsIrreversible
            && JsonNode.DeepEquals(
                JsonSerializer.SerializeToNode(result.State),
                JsonSerializer.SerializeToNode(recovered.Game)
            )
        )
            return recovered;
        LogRefused(logger, lease.GameId, "uncertain_commit");
        return null;
    }

    private async Task<GameState<TState>> Advance(
        GameMutationLease lease,
        GameState<TState> state,
        CancellationToken ct = default
    )
    {
        while (!rules.Processor.GetMembersActions(state.Game).Values.Any(actions => actions.Count > 0))
        {
            var next = await Commit(lease, state, rules.Processor.Advance(state.Game), choice: null, ct);
            if (next is null || lease.IsDirty)
                break;
            state = next;
        }
        return state;
    }

    private async Task RefreshEngine(GameMutationLease lease, GameState<TState> state, CancellationToken ct = default)
    {
        var engine = await states.ReadEngine(lease.GameId, state.Engine.GameVersion, state.Engine.Rewind, ct);
        engine = engine with { Proposal = state.Engine.Proposal, Outcome = state.Engine.Outcome };
        if (JsonNode.DeepEquals(JsonSerializer.SerializeToNode(state.Engine), JsonSerializer.SerializeToNode(engine)))
        {
            LogEngineUnchanged(logger, lease.GameId, state.Version);
            return;
        }
        var next = state with { Version = state.Version + 1, Engine = engine };
        if (await states.Install(lease, state, next, ct))
        {
            LogEngineChanged(logger, lease.GameId, next.Version);
            await Publish(lease.GameId, state, next);
        }
    }

    private async Task Publish(Guid gameId, GameState<TState> previous, GameState<TState> next)
    {
        var started = time.GetTimestamp();
        var outcome = "error";
        try
        {
            var gameChanged = previous.Engine.GameVersion != next.Engine.GameVersion;
            foreach (var member in next.Engine.Members.Keys)
            {
                if (
                    !previous.Engine.Members.ContainsKey(member)
                    || !rules.Processor.GetMembers(previous.Game).Contains(member)
                )
                {
                    LogChangeSkippedForJoiner(logger, gameId, member, next.Version);
                    continue;
                }
                var before = JsonSerializer.SerializeToNode(Project(previous, member), _wireOptions)!;
                var after = JsonSerializer.SerializeToNode(Project(next, member), _wireOptions)!;
                await hub
                    .Clients.Group(GameHub.GetMemberGroupName(gameId, member))
                    .StateChanged(
                        new StateDelta(
                            next.SyncId,
                            next.Version,
                            previous.Engine.GameVersion,
                            next.Engine.GameVersion,
                            before.CreatePatch(after),
                            gameChanged ? ComputeActionPatches(next.Game, member) : null
                        )
                    );
            }
            outcome = "ok";
        }
        catch (Exception exception)
        {
            LogDeliveryFailed(logger, gameId, next.Version, exception);
        }
        finally
        {
            metrics.PublicationDuration.Record(
                time.GetElapsedTime(started).TotalSeconds,
                new KeyValuePair<string, object?>("kind", "delta"),
                new KeyValuePair<string, object?>("outcome", outcome)
            );
        }
    }

    private MemberGameState<JsonNode> Project(GameState<TState> state, string member)
    {
        var checkpoints = state
            .Engine.Rewind.Checkpoints.Where(pair => pair.Value < state.Engine.GameVersion && pair.Value > 0)
            .ToDictionary(StringComparer.Ordinal);
        var proposal = state.Engine.Proposal;
        var engine = new MemberEngineState(
            state.Engine.GameVersion,
            state.Engine.Members,
            member,
            state.Engine.InviteCode,
            new MemberEngineState.Targets(checkpoints, state.Engine.Rewind.Undo),
            proposal is null
                ? null
                : new MemberEngineState.PendingProposal(
                    proposal.Id,
                    proposal.SourceGameVersion,
                    proposal.RequesterId,
                    proposal.Destination,
                    proposal.RequiredVoterIds,
                    proposal.ApprovedVoterIds
                ),
            state.Engine.Outcome
        );
        return new MemberGameState<JsonNode>(state.SyncId, state.Version, engine, ProjectView(state.Game, member));
    }

    private bool IsOffered(TState state, string member, string action) =>
        rules.Processor.GetMembersActions(state).TryGetValue(member, out var offered) && offered.Contains(action);

    private Dictionary<string, JsonPatch> ComputeActionPatches(TState state, string member)
    {
        var before = new JsonObject { ["game"] = ProjectView(state, member) };
        var offered = rules.Processor.GetMembersActions(state).GetValueOrDefault(member) ?? new HashSet<string>();
        return offered.ToDictionary(
            action => action,
            action =>
                before.CreatePatch(
                    new JsonObject
                    {
                        ["game"] = ProjectView(rules.Processor.Execute(state, member, action).State, member),
                    }
                ),
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

    [LoggerMessage(LogLevel.Information, "Game configuration refused: unreadable_configuration")]
    private static partial void LogConfigurationRefused(ILogger logger);

    [LoggerMessage(LogLevel.Debug, "Game {GameId} envelope revision {Version} unchanged")]
    private static partial void LogEngineUnchanged(ILogger logger, Guid gameId, int version);

    [LoggerMessage(LogLevel.Information, "Game {GameId} engine changed at envelope revision {Version}")]
    private static partial void LogEngineChanged(ILogger logger, Guid gameId, int version);

    [LoggerMessage(
        LogLevel.Debug,
        "Game {GameId} envelope revision {Version} skipped for member {UserId}: initial_snapshot_required"
    )]
    private static partial void LogChangeSkippedForJoiner(ILogger logger, Guid gameId, string userId, int version);

    [LoggerMessage(LogLevel.Debug, "Game {GameId} begin: created {Created}")]
    private static partial void LogBegin(ILogger logger, Guid gameId, bool created);

    [LoggerMessage(LogLevel.Debug, "Game {GameId} membership synchronized")]
    private static partial void LogSynced(ILogger logger, Guid gameId);

    [LoggerMessage(LogLevel.Information, "Game {GameId} operation refused: {Reason}")]
    private static partial void LogRefused(ILogger logger, Guid gameId, string reason);

    [LoggerMessage(LogLevel.Debug, "Game {GameId} envelope revision {Version} served to {UserId}")]
    private static partial void LogServed(ILogger logger, Guid gameId, string userId, int version);

    [LoggerMessage(LogLevel.Information, "Game {GameId} committed game version {Version}")]
    private static partial void LogCommitted(ILogger logger, Guid gameId, int version);

    [LoggerMessage(LogLevel.Error, "Game {GameId} commit at expected version {Version} has an unknown outcome")]
    private static partial void LogUnknownCommit(ILogger logger, Guid gameId, int version, Exception exception);

    [LoggerMessage(LogLevel.Error, "Game {GameId} revision {Version} dispatch failed")]
    private static partial void LogDeliveryFailed(ILogger logger, Guid gameId, int version, Exception exception);
}
