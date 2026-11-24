using Microsoft.EntityFrameworkCore;
using Tablier.Contract;
using Tablier.Data;
using Tablier.Engine.History;
using Tablier.Engine.History.Live;

namespace Ahlcg.ApiService.IntegrationTests.Engine.History.Helpers;

internal sealed class HistoryTestCase<TState>(
    Guid gameId,
    IGameHistory<TState> history,
    StoredState<TState> head,
    Func<int, TState> createState,
    ApplicationDbContext reader
)
    where TState : ISchemaVersioned
{
    public Guid GameId { get; } = gameId;
    public IGameHistory<TState> History { get; } = history;
    public StoredState<TState> Head { get; private set; } = head;

    public async Task Append(StepResult<TState> step, PlayerChoice? choice = null, CancellationToken ct = default) =>
        Head = Assert.IsType<StoredState<TState>>(await History.Append(GameId, Head, step, choice, ct));

    public Task Append(
        int counter,
        string? actor = null,
        string[]? checkpoints = null,
        bool baseline = false,
        bool irreversible = false,
        CancellationToken ct = default
    ) =>
        Append(
            new StepResult<TState>(
                createState(counter),
                checkpoints ?? [],
                IsIrreversible: irreversible,
                IsBaseline: baseline
            ),
            choice: actor is null ? null : new PlayerChoice(actor, "move"),
            ct
        );

    public async Task AppendPlain(int from, int to, CancellationToken ct = default)
    {
        for (var counter = from; counter <= to; counter++)
            await Append(counter, ct: ct);
    }

    public async Task Rewind(int targetVersion, CancellationToken ct = default) =>
        Head = Assert.IsType<StoredState<TState>>(await History.Rewind(GameId, Head.Version, targetVersion, ct));

    public Task<StoredState<TState>?> LoadCurrent(CancellationToken ct = default) => History.LoadCurrent(GameId, ct);

    public async Task<HistorySummary> GetSummary(CancellationToken ct = default) =>
        Assert.IsType<HistorySummary>(await History.GetHistorySummary(GameId, Head.Version, ct));

    public Task<List<int>> GetStepVersions(CancellationToken ct = default) =>
        reader
            .GameSteps.AsNoTracking()
            .Where(s => s.GameId == GameId)
            .OrderBy(s => s.Version)
            .Select(s => s.Version)
            .ToListAsync(ct);

    public Task<List<int>> GetSnapshotVersions(CancellationToken ct = default) =>
        reader
            .GameSnapshots.AsNoTracking()
            .Where(s => s.GameId == GameId)
            .OrderBy(s => s.Version)
            .Select(s => s.Version)
            .ToListAsync(ct);

    public async Task<List<StoredState<TState>?>> LoadEverything(CancellationToken ct = default)
    {
        var loaded = new List<StoredState<TState>?> { await History.LoadCurrent(GameId, ct) };
        var barrier = await reader
            .GameSteps.Where(s => s.GameId == GameId && (s.IsBaseline || s.IsIrreversible))
            .MaxAsync(s => (int?)s.Version, ct)
            ?? 0;
        for (var version = 0; version <= Head.Version; version++)
        {
            if (version < barrier)
            {
                await Assert.ThrowsAsync<InvalidOperationException>(() => History.LoadAt(GameId, version, ct));
                loaded.Add(null);
            }
            else
                loaded.Add(await History.LoadAt(GameId, version, ct));
        }
        return loaded;
    }
}
