namespace Tablier.Engine.History.Rewind;

public interface IRewindQueries
{
    Task<RewindMetadata> Load(Guid gameId, int headVersion, CancellationToken ct = default);
}
