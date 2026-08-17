export default {
  forbidden: [
    {
      name: "no-circular",
      severity: "warn",
      comment: "An ES module ultimately imports itself through a chain of other modules. Baseline is 0 — keep it there.",
      // Baseline is 0, so this is purely the standing guard against introducing a real module cycle
      // while #541's layer move is in flight. That is why it can sit at warn without anything
      // slipping through unnoticed.
      from: {},
      to: { circular: true },
    },
    {
      name: "no-folder-cycles",
      severity: "warn",
      comment: "Two folders import from each other, even though no single module does. Expected until #541 finishes the layer move; do not add new ones.",
      // This is the rule that makes #541's three named cycles visible — shared/services against
      // each of shared/ui/components/{dialog,confirm-dialog,sign-in}. None of them are module-level
      // cycles, so `no-circular` above reports nothing for them and only folder scope catches them.
      //
      // `scope: "folder"` is flagged experimental upstream: if a dependency-cruiser bump renames or
      // drops it, that is why this rule silently stops firing.
      scope: "folder",
      from: {},
      to: { circular: true },
    },
  ],
  options: {
    doNotFollow: { path: "node_modules" },
    tsConfig: { fileName: "tsconfig.json" },
    // Type-only imports are real architectural edges too. None of the cycles above need this to be
    // seen — each closes through at least one value import — but `DialogContentWithResult` and
    // `InputLayer` are type aliases, so a cycle that closed only through types would be invisible
    // without it.
    tsPreCompilationDeps: true,
  },
};
