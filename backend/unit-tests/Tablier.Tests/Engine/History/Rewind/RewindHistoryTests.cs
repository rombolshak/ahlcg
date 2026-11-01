using Tablier.Engine.History.Rewind;

namespace Tablier.Tests.Engine.History.Rewind;

public class RewindHistoryTests
{
    [Fact]
    public void NestedRestores_KeepSourceActorAndHideUndoneSpans()
    {
        RewindStep[] steps =
        [
            new(1, Actor: "A", Checkpoint: "a", IsBarrier: false, RestoredVersion: null),
            new(2, Actor: "B", Checkpoint: "b", IsBarrier: false, RestoredVersion: null),
            new(3, Actor: "A", Checkpoint: null, IsBarrier: false, RestoredVersion: null),
            new(4, Actor: null, Checkpoint: "b", IsBarrier: false, RestoredVersion: 2),
            new(5, Actor: "C", Checkpoint: null, IsBarrier: false, RestoredVersion: null),
            new(6, Actor: null, Checkpoint: "b", IsBarrier: false, RestoredVersion: 4),
        ];
        var history = RewindHistory.Create(6, steps, hasInitial: true)!;
        Assert.Equal([new RewindCheckpoint(1, "a")], history.GetCheckpoints());
        Assert.Equal(1, history.GetUndoTarget());
        Assert.Equal(["B"], history.GetConsent(1, "A")!.Order());
        Assert.Null(history.GetConsent(2, "A"));
        var next = RewindHistory.Create(
            7,
            [.. steps, new(7, Actor: null, Checkpoint: "a", IsBarrier: false, RestoredVersion: 1)],
            hasInitial: true
        )!;
        Assert.Equal(0, next.GetUndoTarget());
        Assert.Empty(next.GetConsent(0, "A")!);
    }

    [Fact]
    public void ActorlessStepsAndBarrier_StopUndoAndConsentAtBoundary()
    {
        RewindStep[] steps =
        [
            new(3, Actor: "A", Checkpoint: "barrier", IsBarrier: true, RestoredVersion: null),
            new(4, Actor: "B", Checkpoint: null, IsBarrier: false, RestoredVersion: null),
            new(5, Actor: null, Checkpoint: null, IsBarrier: false, RestoredVersion: null),
            new(6, Actor: null, Checkpoint: null, IsBarrier: false, RestoredVersion: null),
        ];
        var history = RewindHistory.Create(6, steps, hasInitial: false)!;
        Assert.Equal(3, history.GetUndoTarget());
        Assert.Equal(["B"], history.GetConsent(3, "A")!.Order());
        Assert.Null(history.GetConsent(2, "A"));
        Assert.Null(RewindHistory.Create(6, steps[1..], hasInitial: false));
    }

    [Fact]
    public void RestoreAliases_AppearOnceWhenEarlierThanHead()
    {
        RewindStep[] steps =
        [
            new(1, Actor: "A", Checkpoint: "a", IsBarrier: false, RestoredVersion: null),
            new(2, Actor: "B", Checkpoint: "b", IsBarrier: false, RestoredVersion: null),
            new(3, Actor: null, Checkpoint: "b", IsBarrier: false, RestoredVersion: 2),
            new(4, Actor: "C", Checkpoint: null, IsBarrier: false, RestoredVersion: null),
        ];
        var history = RewindHistory.Create(4, steps, hasInitial: true)!;
        Assert.Equal([new RewindCheckpoint(3, "b"), new RewindCheckpoint(1, "a")], history.GetCheckpoints());
        Assert.Equal(3, history.GetUndoTarget());
        Assert.Equal(["B", "C"], history.GetConsent(1, "A")!.Order());
    }
}
