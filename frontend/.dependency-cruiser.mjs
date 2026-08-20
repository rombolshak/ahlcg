// Spec and story files may import fixtures freely; nothing else may.
const SPEC = "\\.(spec|stories)\\.ts$";

export default {
  forbidden: [
    {
      name: "no-circular",
      severity: "error",
      comment: "An ES module ultimately imports itself through a chain of other modules. Baseline is 0 — keep it there.",
      from: {},
      to: { circular: true },
    },
    {
      name: "no-folder-cycles",
      severity: "error",
      comment: "Two folders import from each other, even though no single module does. Baseline is 0 — keep it there.",
      // `scope: "folder"` is flagged experimental upstream: if a dependency-cruiser bump renames or
      // drops it, that is why this rule silently stops firing.
      scope: "folder",
      from: {},
      to: { circular: true },
    },
    {
      name: "ui-imports-down-only",
      severity: "error",
      comment: "ui/ may depend on ui/ and domain/ only.",
      from: { path: "^src/app/ui" },
      to: { path: "^src/app/(core|features|pages)" },
    },
    {
      name: "core-imports-down-only",
      severity: "error",
      comment: "core/ may depend on core/, domain/ and ui/kit/ only — never features/, pages/, or any other ui/ subfolder. The carve-out is ui/kit/ specifically: it is a leaf presentational layer that imports only domain/, so this carve-out cannot introduce a cycle. It exists because core/ is allowed to hold a component (the dialog shell) and a component with a template will always want ui/kit/ primitives. Written as a negative lookahead (\"all of ui/ except kit/\") rather than an enumeration of ui/'s current subfolders, so it keeps holding when a new one appears.",
      from: { path: "^src/app/core" },
      to: { path: "^src/app/(features|pages)|^src/app/ui/(?!kit/)" },
    },
    {
      name: "features-imports-down-only",
      severity: "error",
      comment: "features/ may depend on features/, ui/, core/ and domain/, never pages/.",
      from: { path: "^src/app/features" },
      to: { path: "^src/app/pages" },
    },
    {
      name: "domain-is-a-leaf",
      severity: "error",
      comment: "domain/ imports nothing else from src/app.",
      from: { path: "^src/app/domain" },
      to: { path: "^src/app/(core|ui|features|pages)" },
    },
    {
      name: "no-fixtures-in-production",
      severity: "error",
      comment: "Production code must not import a fixture. game-view/ is the one deliberate exception, tracked separately below at warn until #497 Live game state replaces it.",
      from: { pathNot: [SPEC, "^src/app/domain/testing", "^src/app/pages/game-view"] },
      to: { path: "^src/app/domain/testing" },
    },
    {
      name: "game-view-fixture-import",
      severity: "warn",
      comment: "GameViewComponent imports a fixture in production code. This is a deliberate, visible wart — it resolves with #497 Live game state, not by silencing this rule.",
      from: { path: "^src/app/pages/game-view", pathNot: SPEC },
      to: { path: "^src/app/domain/testing" },
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
