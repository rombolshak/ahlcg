---
description: Commit, push, and open a PR that closes the issue. Sets status to Review.
argument-hint: [issue-number]
allowed-tools: Bash, Read, Write, Glob, Grep
model: haiku
---

Ship the current branch: commit, push, open a PR.

The issue number is `$1`, or derive it from the branch name (branches are `<issue#>-<slug>`).

## 1. Check the state

```bash
git status --porcelain
git diff main...HEAD --stat
git branch --show-current
```

Refuse to ship from `main` — say so and stop.

Read the issue for its acceptance criteria; they become the PR body:

```bash
gh issue view <n> --json number,title,body,url
```

## 2. Commit

Message format is **`area: what changed`**.

`area` is the part of the system touched — free-form, lowercase, whatever describes it best. Real examples from this repo's history:

```
ux: keyboard input manager
tests: migrate to vitest
deps: bump the aspire group with 3 updates
feat: auth endpoint integration
docs: llm instructions
build: fix chromatic.yml
```

This is **not** conventional commits, and `area` is not drawn from a fixed enum. Do not force a change into `feat:`/`fix:` when a more descriptive area exists — `store:`, `auth:`, `i18n:`, `storybook:` are all fine if that is what the change touches.

Subject in the imperative, lowercase after the colon, no trailing period. Body only if it explains *why* — the diff already shows what.

End the message with:

```
Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
```

**Never use `--no-verify`.** The pre-commit hook runs lint-staged (ESLint, Stylelint, Prettier, cspell, `tsc-files`) and pre-push runs the full `ci:all` or `dotnet build && dotnet test`. If a hook fails, fix the cause and commit again. `npm run shove` exists and bypasses hooks — it is the user's personal escape hatch and is not yours to use.

There is no `commit-msg` hook, so nothing validates the message automatically. Getting the format right is on you.

## 3. Push and open the PR

Confirm with the user before pushing. Pushing is outward-facing and hard to walk back.

```bash
git push -u origin <branch>
```

Then:

```bash
gh pr create --title "<conventional title>" --body-file <tmpfile>
```

Use a temp file for the body — never inline, since it contains newlines and backticks that will not survive shell quoting on Windows.

PR body:

- one-paragraph summary of what changed and why
- the acceptance criteria from the issue, as a checklist
- how it was verified (the real commands that were run)
- `Closes #<n>` so the merge closes the issue
- footer: `🤖 Generated with [Claude Code](https://claude.com/claude-code)`

## 4. Board

Set **Status → Review** per `.claude/lib/project-status.md`.

## 5. Report

Give the user the PR URL and the branch name. If the push or PR creation failed, say exactly where it stopped and what state the branch is in locally — do not report a PR that does not exist.
