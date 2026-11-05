namespace Tablier.Games.State.Coordination;

public sealed class GameMutationLease : IDisposable
{
    private readonly Entry _entry;
    private bool _disposed;

    internal GameMutationLease(Guid gameId, Entry entry)
    {
        GameId = gameId;
        _entry = entry;
    }

    public Guid GameId { get; }
    public bool IsDirty
    {
        get => _entry.IsDirty;
        set => _entry.IsDirty = value;
    }
    public bool IsActivated
    {
        get => _entry.IsActivated;
        set => _entry.IsActivated = value;
    }

    public void Dispose()
    {
        if (_disposed)
            return;
        _disposed = true;
        _entry.Gate.Release();
    }

    internal sealed class Entry
    {
        public SemaphoreSlim Gate { get; } = new(1, 1);
        public bool IsDirty { get; set; }
        public bool IsActivated { get; set; }
    }
}
