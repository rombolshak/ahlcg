Read CONTRIBUTING.md for project overview and references.

## Working here

- **Start at [docs/README.md](docs/README.md)** — it routes to the right file for the task at hand.
- **Comments are the exception, not the habit — see [docs/comments.md](docs/comments.md).** Write one only when the code genuinely cannot explain itself; the usual fix for "this needs a comment" is a better name or an extracted function. Two lines is a normal maximum, and a comment that outgrows the code it guards means the design needs simplifying. In tests, prose inside the body is a smell — `// given` / `// when` / `// then` signposts are the only accepted form.
- **Before changing any frontend code, read [docs/frontend-conventions.md](docs/frontend-conventions.md).** The codebase uses `input()`/`output()`, `@if`/`@for`, `inject()`, the `ah` selector prefix, and `OnPush` everywhere, with no exceptions. These are enforced by ESLint and `tsc`, so violations fail the build.
- **The backend implements authentication only.** The frontend game view renders a hardcoded fixture (`@domain/testing/test-game-state`) — there is no game API, no SignalR client, no deployment pipeline. Do not write code that assumes otherwise.
- **This is Windows. Use PowerShell (`powershell` v5 / `pwsh` v7) and the `Write`/`Edit` tools** — not `sed`, `awk`, or bash heredocs, and prefer PowerShell over Python or Node for one-off scripts. A Git Bash tool exists, which is exactly why this needs saying. Long text into a CLI always goes through a temp file and `--body-file`. See [docs/workflow.md](docs/workflow.md#shell).
- Warnings are errors on the backend (`TreatWarningsAsErrors`). Never bypass hooks with `--no-verify`.
- Commit messages are `area: what changed` — `ux: keyboard input manager`, `tests: migrate to vitest`. Not conventional commits; the area is free-form.
- **If pre-commit fails on command-line length, split the commit into smaller ones** staged by area. That is a Windows argument-length limit, not a lint failure, and never a reason for `--no-verify`.

## Feature work

Feature work runs through the issue-driven workflow in [docs/ai-workflow.md](docs/ai-workflow.md): `/groom` → `/work` → `/ship`, with a plan-approval gate before any code is written. Issues are the spec store — the context needed to implement something belongs in the issue body, not in a chat log.

- **An issue body is a claim about the code, not a fact.** Bodies go stale. `/groom` and `/work` both run the read-only `issue-auditor` agent before planning, to check each factual claim against the current code. Plan against what the audit found, not against what the body says.
- Board hierarchy is `Initiative → Project → Epic → Task → Sub-task`, one level per parent/child edge — **a `Task` is never a direct child of a `Project`.** Actionable types, where code gets written, are `Task`, `Sub-task`, and `Bug`; `Feature Request` is intake and must be decomposed or retyped first.
