Read CONTRIBUTING.md for project overview and references.

## Working here

- **Start at [docs/README.md](docs/README.md)** — it routes to the right file for the task at hand.
- **Before changing any frontend code, read [docs/frontend-conventions.md](docs/frontend-conventions.md).** The codebase uses `input()`/`output()`, `@if`/`@for`, `inject()`, the `ah` selector prefix, and `OnPush` everywhere, with no exceptions. These are enforced by ESLint and `tsc`, so violations fail the build.
- **The backend implements authentication only.** The frontend game view renders a hardcoded fixture (`@testing/test-game-state`) — there is no game API, no SignalR client, no deployment pipeline. Do not write code that assumes otherwise.
- Warnings are errors on the backend (`TreatWarningsAsErrors`). Never bypass hooks with `--no-verify`.
- Commit messages are `area: what changed` — `ux: keyboard input manager`, `tests: migrate to vitest`. Not conventional commits; the area is free-form.

## Feature work

Feature work runs through the issue-driven workflow in [docs/ai-workflow.md](docs/ai-workflow.md): `/groom` → `/work` → `/ship`, with a plan-approval gate before any code is written. Issues are the spec store — the context needed to implement something belongs in the issue body, not in a chat log.
