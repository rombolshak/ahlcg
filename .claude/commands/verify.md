---
description: Run exactly what CI would run for whatever changed, and fix what fails.
allowed-tools: Bash, Read, Edit, Glob, Grep
model: sonnet
---

Run the checks CI will run, scoped to what actually changed, and fix failures.

## 1. Scope

```bash
git diff --name-only main...HEAD
git status --porcelain
```

Include uncommitted work — the point is to catch problems before committing, not after.

Match the same split `.github/workflows/ci.yml` uses via `dorny/paths-filter`, so a green run here means a green run there:

| Changed | Run |
| --- | --- |
| `frontend/src/**` or `frontend/*.json` | `cd frontend && npm run ci:all` |
| `backend/**` | `cd backend && dotnet build && dotnet test` |

Nothing relevant changed → say so and stop. Do not run the full suite "to be safe"; the frontend suite is slow and that habit makes the command annoying enough to skip.

`npm run ci:all` is `lint:all` + `test:ci` — ESLint, Stylelint, cspell, Prettier check, `tsc` over both app and spec tsconfigs, then Vitest. On the backend, `<TreatWarningsAsErrors>true</TreatWarningsAsErrors>` is set everywhere, so a warning is a failure.

## 2. Fix

For each failure, fix the **cause**, not the symptom:

- Never widen a type to `any` or add a blanket `eslint-disable` to silence a checker. A suppression needs to be narrowly scoped and carry a reason, as `card-info.service.ts` does.
- Never weaken or delete a failing assertion to make a test pass. If a test is genuinely wrong, say so and explain why before changing it.
- cspell failures usually mean a real typo. If the word is legitimately new, add it to the project dictionary rather than rewording around it.
- Prettier failures: `npm run format`.
- Check `docs/testing.md` for the known frontend traps — `ECONNREFUSED` on assets means a missing `serveCardAssets` interceptor; a never-resolving emission means `output()` was treated as an Observable; a non-compiling input assignment means `componentRef.setInput` is needed.

Re-run after fixing. Repeat until green or genuinely stuck.

## 3. Report honestly

State the commands you ran and their real results.

If something still fails, **say so plainly and include the actual error output.** Do not describe a run as passing when it did not, and do not bury a failure in a summary. A red result reported clearly is useful; a red result described as green destroys the trust the whole workflow depends on.

If you are stuck, say what you tried and what you think is going on.
