
Run the checks CI will run, scoped to what actually changed, and fix failures.

## 1. Scope

```bash
git diff --name-only <layer-base-commit>
git ls-files --others --exclude-standard
git status --porcelain
```

Include uncommitted work — the point is to catch problems before committing, not after.

Use the recorded layer base; standalone, resolve the merge base with main if no layer base exists. Include staged, unstaged, committed layer changes and relevant untracked files.

Read `.github/workflows/ci.yml` and its called workflows each time, rather than relying on a copied path-filter table. Match their current filters and exclusions. Current local checks include:

| Selected CI area | Local checks |
| --- | --- |
| Frontend | In `frontend`: `npm run ci:all` and `npm run test:component` |
| i18n | In `frontend`: `npm run lint:i18n` |
| Backend | In `backend`: `dotnet build` then `dotnet test` |
| End-to-end | In `e2e`: `npm test`, with the prerequisites from `.github/workflows/e2e.yml` and `docs/practice/testing.md` |
| Chromatic | In `frontend`: `npm run build-storybook`; hosted visual approval remains a CI result |

Workflow changes themselves can select checks. Read the live scripts before running them. Use the Aspire skill if managing the AppHost or its prerequisites. Do not claim local build/test commands reproduce hosted coverage, Sonar, Coveralls, or Chromatic results; report those separately. Do not publish artifacts or use CI secrets just to simulate a hosted job.

Nothing relevant changed: report that and stop. Do not run the application suites for workflow-documentation-only changes. Backend warnings are errors. Report unavailable prerequisites or skipped checks explicitly; incomplete validation is not green.

## 2. Fix

For each failure, fix the **cause**, not the symptom:

- Never widen a type to `any` or add a blanket `eslint-disable` to silence a checker. A suppression needs to be narrowly scoped and carry a reason, as `card-info.service.ts` does.
- Never weaken or delete a failing assertion to make a test pass. If a test is genuinely wrong, say so and explain why before changing it.
- cspell failures usually mean a real typo. If the word is legitimately new, add it to the project dictionary rather than rewording around it.
- Prettier failures: `npm run format`.
- Check `docs/practice/testing.md` for the known frontend traps — `ECONNREFUSED` on assets means a missing `serveCardAssets` interceptor; a never-resolving emission means `output()` was treated as an Observable; a non-compiling input assignment means `componentRef.setInput` is needed.

Re-run after fixing. Repeat until green or genuinely stuck.

## 3. Report honestly

State the commands you ran and their real results.

If something still fails, **say so plainly and include the actual error output.** Do not describe a run as passing when it did not, and do not bury a failure in a summary. A red result reported clearly is useful; a red result described as green destroys the trust the whole workflow depends on.

If you are stuck, say what you tried and what you think is going on.
