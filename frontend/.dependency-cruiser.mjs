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
      // This is the rule that makes #541's named cycles visible — core/ against
      // ui/components/sign-in (the other two, core/ against ui/components/{dialog,confirm-dialog},
      // were closed by #544). None of them are module-level cycles, so `no-circular` above reports
      // nothing for them and only folder scope catches them.
      //
      // `scope: "folder"` is flagged experimental upstream: if a dependency-cruiser bump renames or
      // drops it, that is why this rule silently stops firing.
      scope: "folder",
      from: {},
      to: { circular: true },
    },
    {
      name: "ui-imports-down-only",
      severity: "warn",
      comment: "ui/ may depend on ui/ and domain/ only. Reports pre-existing violations by design — #541's features-extraction issues drive this to zero.",
      from: { path: "^src/app/ui" },
      to: { path: "^src/app/(core|features|pages)" },
    },
    {
      name: "core-imports-down-only",
      severity: "warn",
      comment: "core/ may depend on core/ and domain/ only. Reports pre-existing violations by design — #541's features-extraction issues drive this to zero.",
      from: { path: "^src/app/core" },
      to: { path: "^src/app/(ui|features|pages)" },
    },
    {
      name: "features-imports-down-only",
      severity: "warn",
      comment: "features/ may depend on features/, ui/, core/ and domain/, never pages/. Reports pre-existing violations by design — #541's features-extraction issues drive this to zero.",
      from: { path: "^src/app/features" },
      to: { path: "^src/app/pages" },
    },
    {
      name: "domain-is-a-leaf",
      severity: "warn",
      comment: "domain/ imports nothing else from src/app. Reports pre-existing violations by design — #541's features-extraction issues drive this to zero.",
      from: { path: "^src/app/domain" },
      to: { path: "^src/app/(core|ui|features|pages)" },
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
