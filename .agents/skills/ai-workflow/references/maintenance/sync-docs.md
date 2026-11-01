
Find and fix claims in `docs/` that the current changes made false.

`docs/README.md` states the governing rule: *"Every claim here is checked against the code; if a doc and the code disagree, the code wins — fix the doc."* This command enforces that.

## Dispatch (caller only)

Delegate synchronously to the configured Codex `docs-sync` agent. Pass the requested area/file or layer scope, issue and approved plan where available, recorded base, complete current changes including relevant untracked files, review/verification results, and known drift. Await its report and inspect the documentation diff. The agent executes the procedure below starting at Scope; it must not redispatch this action to itself.

## 1. Scope

If `$1` names an area or file, start there. Otherwise:

```bash
git diff --name-only <layer-base-commit>
git status --porcelain
```

When called by work, use its recorded layer base and include staged, unstaged, and relevant untracked files. Standalone, resolve the merge base with main if no layer base is recorded.

## 2. Find affected claims

Map changed code to the docs that describe it:

| Changed | Check |
| --- | --- |
| `frontend/src/app/**` component/service/directive | `docs/frontend/frontend.md` (layout tree, service table), `docs/frontend/frontend-conventions.md` |
| `frontend/src/app/pages/game-view/store/**`, `frontend/src/app/features/games/**` | `docs/frontend/state-store.md` |
| `backend/**` endpoints, entities, migrations | `docs/backend/backend.md`, `docs/backend/api.md` |
| Auth, cookies, secrets | `docs/backend/security.md` |
| Specs, test setup, `angular.json` test target | `docs/practice/testing.md` |
| `package.json` scripts, workflows, husky hooks | `docs/practice/workflow.md` |
| What exists at all | `docs/architecture.md` — the canonical status table; `docs/README.md`, `AGENTS.md`, `CLAUDE.md`, `CONTRIBUTING.md`, and `frontend/README.md` for routing and stale summaries |

Keep capability status in `docs/architecture.md` and link to it from entry points rather than duplicating the inventory. Check source comments and OpenAPI descriptions for stale claims too; report source changes outside the supplied docs scope.

Grep the docs for names you changed — a renamed service or moved file is the most common source of a stale claim.

Pay attention to `docs/architecture.md`: it asserts what does and does not exist. If a change makes "does not exist" untrue — a game-state endpoint, game state carried over SignalR, a deployment step — that table is now wrong and matters more than any other doc, because every other doc and agent trusts it.

## 3. Fix

Follow the documented conventions for these files:

- Repo-relative paths, or the TypeScript aliases the code uses (`@domain/...`).
- Code samples **only** where the shape is project-specific and non-obvious. Otherwise point at the real file.
- Sections for unimplemented features are **omitted, not marked "planned"**. Do not add aspirational content.
- Fix the specific untrue claim. Do not rewrite surrounding prose that is still correct — a large diff in `docs/` for a small code change is hard to review and easy to get wrong.

## 4. Report

List each doc changed and the claim that had become false. If you found nothing stale, say so — that is a normal and good result, not a reason to make edits.

If a change makes a doc *incomplete* rather than *wrong* (a new service with no row in the table), add the directly affected factual entry within the approved scope. Ask only if completing the documentation would require a new product decision or unrelated scope.
