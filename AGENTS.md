Read CONTRIBUTING.md for project overview and references.

## Working here

- **Start at [docs/README.md](docs/README.md)** — it routes to the right file for the task at hand.
- **Before changing any frontend code, read [docs/frontend/frontend-conventions.md](docs/frontend/frontend-conventions.md).** The codebase uses `input()`/`output()`, `@if`/`@for`, `inject()`, the `ah` selector prefix, and `OnPush` everywhere, with no exceptions. These are enforced by ESLint and `tsc`, so violations fail the build.
- **Current capabilities are recorded in [docs/architecture.md](docs/architecture.md#what-exists).** Read that status table before assuming what the backend, routed fixture game, or Arkham board supports.
- **Backend code must log every decision it makes** — each refusal, state change and no-op, through `[LoggerMessage]`, ids only. See [docs/backend/backend.md](docs/backend/backend.md#logging).
- Warnings are errors on the backend (`TreatWarningsAsErrors`). Never bypass hooks with `--no-verify`.
- Commit subjects and PR titles use `area: what changed`, lowercase imperative wording, and no trailing period: `ux: add keyboard input manager`, `tests: migrate to vitest`. The area is free-form; this is not Conventional Commits.

## Feature work

Feature work runs through the issue-driven workflow in [docs/practice/ai-workflow.md](docs/practice/ai-workflow.md): groom the parent before decompose, then groom and work each actionable child. Codex uses `$ai-workflow <action>`; Claude Code uses `/<action>`. UI changes require approved Figma mockups before implementation planning. Work gates the layer plan, then runs wording, implementation, bounded independent review, docs sync, and `gh stack submit` per layer. Issues hold the approved spec, design references, plan, and progress; implementation never invents UI copy.
