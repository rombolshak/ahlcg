---
description: Check docs/ against the code that changed and fix anything a change made untrue.
argument-hint: [area or file]
allowed-tools: Bash, Read, Edit, Glob, Grep
model: sonnet
---

Find and fix claims in `docs/` that the current changes made false.

`docs/README.md` states the governing rule: *"Every claim here is checked against the code; if a doc and the code disagree, the code wins — fix the doc."* This command enforces that.

## 1. Scope

If `$1` names an area or file, start there. Otherwise:

```bash
git diff --name-only main...HEAD
git status --porcelain
```

## 2. Find affected claims

Map changed code to the docs that describe it:

| Changed | Check |
| --- | --- |
| `frontend/src/app/**` component/service/directive | `docs/frontend.md` (layout tree, service table), `docs/frontend-conventions.md` |
| `frontend/src/app/pages/game-view/store/**` | `docs/state-store.md` |
| `backend/**` endpoints, entities, migrations | `docs/backend.md`, `docs/api.md` |
| Auth, cookies, secrets | `docs/security.md` |
| Specs, test setup, `angular.json` test target | `docs/testing.md` |
| `package.json` scripts, workflows, husky hooks | `docs/workflow.md` |
| What exists at all | `docs/architecture.md` — the status table |

Grep the docs for names you changed — a renamed service or moved file is the most common source of a stale claim.

Pay attention to `docs/architecture.md`: it asserts what does and does not exist. If a change makes "does not exist" untrue — a game API endpoint, a SignalR client, a deployment step — that table is now wrong and matters more than any other doc, because every other doc and agent trusts it.

## 3. Fix

Follow the documented conventions for these files:

- Repo-relative paths, or the TypeScript aliases the code uses (`@domain/...`).
- Code samples **only** where the shape is project-specific and non-obvious. Otherwise point at the real file.
- Sections for unimplemented features are **omitted, not marked "planned"**. Do not add aspirational content.
- Fix the specific untrue claim. Do not rewrite surrounding prose that is still correct — a large diff in `docs/` for a small code change is hard to review and easy to get wrong.

## 4. Report

List each doc changed and the claim that had become false. If you found nothing stale, say so — that is a normal and good result, not a reason to make edits.

If a change makes a doc *incomplete* rather than *wrong* (a new service with no row in the table), flag it and ask whether to add it, rather than silently expanding scope.
