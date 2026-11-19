using Tablier.Contract;
using Tablier.Engine.History;
using Tablier.Engine.History.Live;

namespace Tablier.Tests.Engine.History.Live;

public class HistorySummaryTests
{
    [Fact]
    public void Constructor_MutableCheckpointInput_CopiesAndProtectsOrdinalCheckpointValues()
    {
        var checkpoints = new Dictionary<string, int> { ["turn"] = 1, ["Turn"] = 2 };
        var summary = new HistorySummary(3, 0, checkpoints, LastAction: null);

        checkpoints["turn"] = 3;
        checkpoints.Clear();

        Assert.Equal(1, summary.Checkpoints["turn"]);
        Assert.Equal(2, summary.Checkpoints["Turn"]);
        var exposed = Assert.IsAssignableFrom<IDictionary<string, int>>(summary.Checkpoints);
        Assert.Throws<NotSupportedException>(() => exposed["turn"] = 3);
        Assert.Equal(1, summary.ApplyStep(new StepResult<int>(4)).Checkpoints["turn"]);
    }

    [Fact]
    public void Empty_CheckpointMutationAttempt_LeavesSharedSummaryEmpty()
    {
        var checkpoints = Assert.IsAssignableFrom<IDictionary<string, int>>(HistorySummary.Empty.Checkpoints);

        Assert.Throws<NotSupportedException>(() => checkpoints["turn"] = 1);

        Assert.Empty(HistorySummary.Empty.Checkpoints);
        Assert.Empty(HistorySummary.Empty.ApplyStep(new StepResult<int>(1)).Checkpoints);
    }

    [Fact]
    public void ApplyStep_DuplicateCheckpoint_ReplacesOnlyLatestTagWithoutMutatingPrevious()
    {
        var previous = new HistorySummary(
            3,
            0,
            new Dictionary<string, int> { ["turn"] = 1, ["phase"] = 2 },
            LastAction: null
        );

        var summary = previous.ApplyStep(new StepResult<int>(4, ["turn", "round"]));

        Assert.Equal(4, summary.GameVersion);
        Assert.Equal(4, summary.Checkpoints["turn"]);
        Assert.Equal(4, summary.Checkpoints["round"]);
        Assert.Equal(2, summary.Checkpoints["phase"]);
        Assert.Equal(1, previous.Checkpoints["turn"]);
    }

    [Fact]
    public void ApplyStep_ActorlessTail_PreservesLatestActionAndUndoSource()
    {
        var previous = new HistorySummary(1, 0, new Dictionary<string, int>(), LastAction: null);

        var summary = previous
            .ApplyStep(new StepResult<int>(2), new PlayerChoice("a", "move"))
            .ApplyStep(new StepResult<int>(3));

        Assert.Equal(new HistoryAction(2, 2, "a", "move"), summary.LastAction);
        Assert.Equal(1, summary.GetTargets()["undo"]);
    }

    [Theory]
    [InlineData(true, false)]
    [InlineData(false, true)]
    public void ApplyStep_Barrier_ClearsEarlierCheckpointsAndAction(bool baseline, bool irreversible)
    {
        var previous = new HistorySummary(
            3,
            0,
            new Dictionary<string, int> { ["old"] = 1 },
            new HistoryAction(2, 2, "a", "move")
        );

        var summary = previous.ApplyStep(
            new StepResult<int>(4, ["new"], IsIrreversible: irreversible, IsBaseline: baseline)
        );

        Assert.Equal(4, summary.BarrierVersion);
        Assert.Equal(4, Assert.Single(summary.Checkpoints).Value);
        Assert.Null(summary.LastAction);
        Assert.Empty(summary.GetTargets());
    }

    [Fact]
    public void ApplyRewind_NestedRepresentative_PreservesOriginalActionAndRebasesHeadTags()
    {
        var destination = new HistorySummary(
            2,
            0,
            new Dictionary<string, int> { ["turn"] = 2 },
            new HistoryAction(2, 2, "a", "move")
        );
        var third = destination.ApplyStep(new StepResult<int>(3), new PlayerChoice("b", "move"));
        var fourth = third.ApplyRewind(destination);
        var fifth = fourth.ApplyStep(new StepResult<int>(5), new PlayerChoice("c", "move"));

        var sixth = fifth.ApplyRewind(fourth).ApplyStep(new StepResult<int>(7));

        Assert.Equal(7, sixth.GameVersion);
        Assert.Equal(6, sixth.Checkpoints["turn"]);
        Assert.Equal(new HistoryAction(6, 2, "a", "move"), sixth.LastAction);
        Assert.Equal(1, sixth.GetTargets()["undo"]);
        Assert.Equal(6, sixth.GetTargets()["turn"]);
    }

    [Fact]
    public void ApplyRewind_BarrierDestination_RebasesBarrierAndOmitsUnreachableUndo()
    {
        var destination = new HistorySummary(
            2,
            2,
            new Dictionary<string, int> { ["turn"] = 2 },
            new HistoryAction(2, 2, "a", "move")
        );
        var previous = new HistorySummary(5, 2, new Dictionary<string, int>(), LastAction: null);

        var summary = previous.ApplyRewind(destination).ApplyStep(new StepResult<int>(7));

        Assert.Equal(6, summary.BarrierVersion);
        Assert.Equal(6, Assert.Single(summary.GetTargets()).Value);
        Assert.Equal("turn", Assert.Single(summary.GetTargets()).Key);
    }

    [Fact]
    public void GetTargets_CurrentHeadBehindBarrierAndLegacyUndo_OnlyOffersReachableCheckpoint()
    {
        var summary = new HistorySummary(
            8,
            4,
            new Dictionary<string, int>
            {
                ["old"] = 3,
                ["barrier"] = 4,
                ["head"] = 8,
                ["undo"] = 5,
            },
            new HistoryAction(6, 1, "a", "move")
        );

        var targets = summary.GetTargets();

        Assert.Equal("barrier", Assert.Single(targets).Key);
        Assert.Equal(4, Assert.Single(targets).Value);
    }
}
