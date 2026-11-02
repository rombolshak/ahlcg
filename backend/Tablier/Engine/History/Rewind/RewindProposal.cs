namespace Tablier.Engine.History.Rewind;

#pragma warning disable MA0048
public sealed record RewindTargets(int Head, IReadOnlyList<RewindCheckpoint> Checkpoints, int? UndoTarget);

public sealed record RewindProposal(
    Guid Id,
    int Head,
    int Target,
    string Requester,
    IReadOnlyList<string> Required,
    IReadOnlyList<string> Approved
);
#pragma warning restore MA0048
