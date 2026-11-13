using Tablier.Engine.History.Rewind;

namespace Tablier.Tests.Engine.History.Rewind;

public class HistorySummaryTests
{
    [Fact]
    public void ApplyStep_MultipleDuplicateIds_ReplacesEachLatestOccurrence()
    {
        var summary = new HistorySummary(
            3,
            0,
            new Dictionary<string, int>(StringComparer.Ordinal) { ["turn"] = 1, ["phase"] = 2 },
            new HistoryAction(3, "a")
        );

        var updated = summary.ApplyStep(new StepMetadata(4, ["turn", "round", "turn"]));

        Assert.Equal(4, updated.GameVersion);
        Assert.Equal(0, updated.BarrierVersion);
        Assert.Equal(3, updated.Checkpoints.Count);
        Assert.Equal(4, updated.Checkpoints["turn"]);
        Assert.Equal(4, updated.Checkpoints["round"]);
        Assert.Equal(2, updated.Checkpoints["phase"]);
        Assert.Equal(new HistoryAction(3, "a"), updated.LastAction);
        Assert.Equal(1, summary.Checkpoints["turn"]);
    }

    [Fact]
    public void GetTargets_LatestOccurrenceAtHead_DoesNotOfferOlderOccurrence()
    {
        var summary = HistorySummary
            .Empty.ApplyStep(new StepMetadata(1, ["turn", "phase"]))
            .ApplyStep(new StepMetadata(2, ["turn"]));

        var targets = summary.GetTargets();

        Assert.Equal(2, summary.Checkpoints["turn"]);
        Assert.Equal([new HistoryTarget("phase", 1)], targets);
    }

    [Fact]
    public void ApplyStep_ActorlessTail_RetainsOriginalActionAndUndoDestination()
    {
        var summary = new HistorySummary(
            5,
            0,
            new Dictionary<string, int>(StringComparer.Ordinal) { ["turn"] = 2 },
            new HistoryAction(5, "guest")
        );

        var updated = summary.ApplyStep(new StepMetadata(6, []));

        Assert.Equal(new HistoryAction(5, "guest"), updated.LastAction);
        Assert.Contains(new HistoryTarget("undo", 4), updated.GetTargets());
    }

    [Fact]
    public void ApplyStep_ActorlessBarrier_DiscardsOlderCheckpointsAndAction()
    {
        var summary = new HistorySummary(
            5,
            0,
            new Dictionary<string, int>(StringComparer.Ordinal) { ["turn"] = 2 },
            new HistoryAction(5, "a")
        );

        var updated = summary.ApplyStep(new StepMetadata(6, ["phase"], IsBarrier: true));

        Assert.Equal(6, updated.BarrierVersion);
        Assert.Single(updated.Checkpoints);
        Assert.Equal(6, updated.Checkpoints["phase"]);
        Assert.Null(updated.LastAction);
        Assert.Empty(updated.GetTargets());
        Assert.Equal([new HistoryTarget("phase", 6)], updated.ApplyStep(new StepMetadata(7, [])).GetTargets());
    }

    [Fact]
    public void ApplyStep_ActionAtBarrier_RetainsFactWithoutOfferingBlockedUndo()
    {
        var summary = new HistorySummary(
            5,
            0,
            new Dictionary<string, int>(StringComparer.Ordinal) { ["turn"] = 2 },
            new HistoryAction(4, "a")
        );

        var updated = summary.ApplyStep(new StepMetadata(6, [], "b", IsBarrier: true));

        Assert.Equal(new HistoryAction(6, "b"), updated.LastAction);
        Assert.Empty(updated.Checkpoints);
        Assert.Empty(updated.GetTargets());
    }

    [Fact]
    public void ApplyStep_FirstAction_RetainsFactWithoutOfferingVersionZero()
    {
        var summary = HistorySummary.Empty.ApplyStep(new StepMetadata(1, [], "a"));

        Assert.Equal(new HistoryAction(1, "a"), summary.LastAction);
        Assert.Empty(summary.GetTargets());
        Assert.Empty(HistorySummary.Empty.GetTargets());
    }

    [Fact]
    public void ApplyRewind_DestinationSummary_RebasesAllHeadTagsAndKeepsEarlierTag()
    {
        var destination = new HistorySummary(
            20,
            0,
            new Dictionary<string, int>(StringComparer.Ordinal)
            {
                ["turn"] = 10,
                ["phase"] = 20,
                ["round"] = 20,
            },
            new HistoryAction(15, "guest")
        );

        var rewound = destination.ApplyRewind(31);

        Assert.Equal(31, rewound.GameVersion);
        Assert.Equal(10, rewound.Checkpoints["turn"]);
        Assert.Equal(31, rewound.Checkpoints["phase"]);
        Assert.Equal(31, rewound.Checkpoints["round"]);
        Assert.Equal(new HistoryAction(15, "guest"), rewound.LastAction);
        Assert.Equal(20, destination.Checkpoints["phase"]);
        Assert.Equal(2, rewound.GetTargets().Count);
        Assert.Contains(new HistoryTarget("turn", 10), rewound.GetTargets());
        Assert.Contains(new HistoryTarget("undo", 14), rewound.GetTargets());
        Assert.Contains(new HistoryTarget("phase", 31), rewound.ApplyStep(new StepMetadata(32, [])).GetTargets());
    }

    [Fact]
    public void ApplyRewind_RepeatedAlias_KeepsOriginalActionVersionForUndo()
    {
        var destination = new HistorySummary(
            8,
            0,
            new Dictionary<string, int>(StringComparer.Ordinal) { ["turn"] = 8 },
            new HistoryAction(5, "a")
        );

        var rewound = destination.ApplyRewind(12).ApplyRewind(18);

        Assert.Equal(18, rewound.Checkpoints["turn"]);
        Assert.Equal(new HistoryAction(5, "a"), rewound.LastAction);
        Assert.Equal([new HistoryTarget("undo", 4)], rewound.GetTargets());
    }

    [Fact]
    public void Constructor_MutableCheckpointInput_CopiesItsFacts()
    {
        var checkpoints = new Dictionary<string, int>(StringComparer.Ordinal) { ["turn"] = 1 };
        var summary = new HistorySummary(2, 0, checkpoints, lastAction: null);

        checkpoints["turn"] = 2;

        Assert.Equal(1, summary.Checkpoints["turn"]);
    }

    [Fact]
    public void ApplyRewind_CurrentHeadSummary_RefusesNextPhysicalVersion()
    {
        var current = new HistorySummary(9, 0, new Dictionary<string, int>(StringComparer.Ordinal), lastAction: null);

        Assert.Throws<InvalidOperationException>(() => current.ApplyRewind(10));
    }

    [Theory]
    [InlineData(0)]
    [InlineData(2)]
    public void ApplyStep_DiscontinuousVersion_Throws(int version) =>
        Assert.Throws<InvalidOperationException>(() => HistorySummary.Empty.ApplyStep(new StepMetadata(version, [])));

    [Theory]
    [InlineData(2)]
    [InlineData(3)]
    [InlineData(4)]
    public void ApplyRewind_VersionDoesNotAdvance_Throws(int version)
    {
        var summary = new HistorySummary(3, 0, new Dictionary<string, int>(StringComparer.Ordinal), lastAction: null);

        Assert.Throws<InvalidOperationException>(() => summary.ApplyRewind(version));
    }

    [Fact]
    public void ApplyStep_ReservedUndoCheckpoint_Throws() =>
        Assert.Throws<InvalidOperationException>(() => HistorySummary.Empty.ApplyStep(new StepMetadata(1, ["undo"])));
}
