using Tablier.Engine.History.Rewind;

namespace Tablier.Tests.Engine.History.Rewind;

public class RewindMetadataTests
{
    [Fact]
    public void Apply_DuplicateCheckpoint_KeepsOnlyLatestIncludingHead()
    {
        var metadata = RewindMetadata.Empty.Apply(
            new HistoryMetadata(1, Actor: null, "turn", IsBarrier: false, RestoredVersion: null)
        );

        var next = metadata.Apply(new HistoryMetadata(2, Actor: null, "turn", IsBarrier: false, RestoredVersion: null));

        Assert.Equal(2, next.Checkpoints["turn"]);
        Assert.Single(next.Checkpoints);
    }

    [Fact]
    public void Apply_ActorlessTail_RetainsSourceActorAndDestination()
    {
        var metadata = RewindMetadata
            .Empty.Apply(new HistoryMetadata(1, Actor: null, Checkpoint: null, IsBarrier: false, RestoredVersion: null))
            .Apply(new HistoryMetadata(2, "alice", Checkpoint: null, IsBarrier: false, RestoredVersion: null));

        var next = metadata.Apply(
            new HistoryMetadata(3, Actor: null, Checkpoint: null, IsBarrier: false, RestoredVersion: null)
        );

        Assert.Equal(new UndoTarget(1, "alice"), next.Undo);
        Assert.Equal(3, next.GameVersion);
    }

    [Fact]
    public void Apply_Barrier_DropsEarlierTargetsAndRetainsBarrierCheckpoint()
    {
        var metadata = RewindMetadata.Empty.Apply(
            new HistoryMetadata(1, Actor: null, "old", IsBarrier: false, RestoredVersion: null)
        );

        var next = metadata.Apply(new HistoryMetadata(2, "alice", "boundary", IsBarrier: true, RestoredVersion: null));

        Assert.Null(next.Undo);
        Assert.Equal(2, next.Boundary);
        Assert.Equal(2, next.Checkpoints["boundary"]);
        Assert.False(next.Checkpoints.ContainsKey("old"));
    }

    [Fact]
    public void Apply_FirstAction_DoesNotOfferVersionZero()
    {
        var next = RewindMetadata.Empty.Apply(
            new HistoryMetadata(1, "alice", Checkpoint: null, IsBarrier: false, RestoredVersion: null)
        );

        Assert.Null(next.Undo);
    }

    [Theory]
    [InlineData(1, 1)]
    [InlineData(2, null)]
    public void Apply_RestoreOrGap_RequiresReconstruction(int version, int? restoredVersion)
    {
        var step = new HistoryMetadata(version, Actor: null, Checkpoint: null, IsBarrier: false, restoredVersion);

        Assert.Throws<InvalidOperationException>(() => RewindMetadata.Empty.Apply(step));
    }

    [Theory]
    [InlineData(false)]
    [InlineData(true)]
    public void Apply_LongOrdinaryHistory_MatchesIndependentMetadataReduction(bool hasBarrier)
    {
        var steps = Enumerable
            .Range(1, 1000)
            .Select(version => new HistoryMetadata(
                version,
                version % 3 == 0 ? "alice" : null,
                version % 10 == 0 ? "turn" : null,
                hasBarrier && version == 800,
                RestoredVersion: null
            ))
            .ToList();

        var maintained = steps.Aggregate(RewindMetadata.Empty, (metadata, step) => metadata.Apply(step));

        var boundary = steps.Where(step => step.IsBarrier).Select(step => step.Version).DefaultIfEmpty().Max();
        var checkpoints = steps
            .Where(step => step.Version >= boundary && step.Checkpoint is not null)
            .GroupBy(step => step.Checkpoint!)
            .ToDictionary(group => group.Key, group => group.Max(step => step.Version), StringComparer.Ordinal);
        var action = steps.Last(step => step.Actor is not null);
        var expected = new RewindMetadata(
            1000,
            boundary,
            checkpoints,
            new UndoTarget(action.Version - 1, action.Actor!)
        );
        Assert.Equivalent(expected, maintained, strict: true);
    }
}
