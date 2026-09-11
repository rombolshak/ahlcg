---
description: Commit, push, and open a PR that closes the issue. The board moves to Review on its own.
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

**If pre-commit fails on command-line length, split the commit.** This is Windows: lint-staged passes every staged path as an argument, and a big enough changeset exceeds the limit before any linter runs. Symptoms are a failure about the command line being too long or the input line being too long — not a lint finding.

Stage by area and commit in several passes (`git add frontend/src/app/game`, commit; `git add backend`, commit; and so on) until each command line fits. Each commit still needs a real `area: what changed` subject describing that slice — do not produce `part 1` / `part 2`. This is a mechanical workaround for an OS limit, so it is **not** a reason to reach for `--no-verify`: the whole problem is that the checks did not get to run.

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

**Do not touch it.** Opening the PR moves **Status → Review** on its own — the project has a built-in GitHub workflow for it. Setting the field by hand is a redundant write that only risks racing the automation.

Iteration was already set by `/work` when the work started, and does not change here.

## 5. Report

Give the user the PR URL and the branch name. If the push or PR creation failed, say exactly where it stopped and what state the branch is in locally — do not report a PR that does not exist.
