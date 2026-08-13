---
description: Break a large issue (initiative/project/epic) into implementable child issues, linked as sub-issues and added to the project board.
argument-hint: <issue-number>
allowed-tools: Bash, Read, Write, Glob, Grep, AskUserQuestion
model: opus
---

Break issue **#$1** into children that are small enough to implement.

## Which issues this applies to

The board uses a real four-level hierarchy — check the `Type` field:

| Type | Decompose it? |
| --- | --- |
| `Initiative` → `Project` → `Epic` | Yes — these exist to be broken down |
| `Task` | Only if it turned out too big; children become `Sub-task` |
| `Sub-task`, `Bug`, `Feature Request` | No — these go to `/work` |

If `#$1` is already an implementable type with a decent body, say so and point at `/work` instead.

## 1. Understand the parent

```bash
gh issue view $1 --json number,title,body,url
```

Read its ancestors too, if any, for inherited context.

**Check whether it already has sub-issues.** If it does, stop and point the user at `/redecompose $1` — that command audits an existing breakdown, fills in thin child bodies, and preserves the content and comment history already on those issues. Creating a second parallel set of children here would leave a mess someone has to untangle by hand.

## 2. Ground the breakdown in reality

The most common way this goes wrong is decomposing an idealised architecture instead of the one that exists. Before proposing anything:

- Read `docs/architecture.md`. **The backend implements authentication only. The game view renders `@domain/test/test-game-state`, not server data. There is no game API, no SignalR client, no deployment pipeline.** A breakdown that assumes any of these produces issues nobody can implement.
- Read the docs for the areas involved (`docs/README.md` routes you).
- Look at the real code. If a child issue says "extend the X service", X had better exist — or the breakdown needs an issue to create it first.

Read the parent's own dependencies too (`.claude/lib/issue-dependencies.md`) — anything blocking the parent blocks every child, and is worth stating once here rather than repeating down the tree.

## 3. Ask what the parent is actually for

Follow `.claude/lib/intent-interview.md`.

Parents are the thinnest issues on this board — `#152 "Core meta-game mechanics"` is a six-line list of nouns. Two people reading it would produce completely different breakdowns, and the difference is not recoverable from the title.

Ask before proposing, not after. A breakdown built on a guessed intent looks reasonable enough to approve, and then every child inherits the guess as if it were a decision.

Ask specifically about **boundary and depth** here — how much of this the user wants to exist at the end, and where the first version stops. Those two answers determine how many children there are, which is the whole output of this command.

## 4. Propose the breakdown

Good children:

- **Independently implementable** — each becomes one branch, one PR. If two must land together, they are one issue.
- **Vertically sliced where possible** — a thin end-to-end capability beats a horizontal "add all the models" layer, because a horizontal slice cannot be verified until its siblings land.
- **Ordered**, with dependencies stated as real `Blocked by` edges. Say which must come first and why. Only genuine blockers — read the rules in `.claude/lib/issue-dependencies.md` before proposing any, and check the direction of each edge in a sentence: *"B is blocked by A."*
- **Sized for a session.** If you cannot describe a child's acceptance criteria in a few bullets, it is still an epic — mark it as one to decompose again later rather than pretending it is a task.

Watch for the work that is easy to forget: tests, translations (Transloco keys for every enabled language), Storybook stories, docs updates, EF migrations.

Set each child's `Type` one level down from the parent: `Initiative`→`Project`, `Project`→`Epic`, `Epic`→`Task`, `Task`→`Sub-task`. A child that is a defect is `Bug` regardless of depth.

Present as a numbered list — title, one-line purpose, proposed `Type`, and which siblings block it. **Wait for approval.** Do not create anything yet; a wrong breakdown creates real issues on a real board that the user then has to clean up by hand.

## 5. Create them

For each approved child, write a full body following `.claude/lib/issue-spec-template.md` — fold down the parent's context so the child stands alone. Then:

```bash
gh issue create --title "<title>" --body-file <tmpfile> --parent $1
```

Use a temp file for the body (`$CLAUDE_JOB_DIR/tmp` or system temp) — never inline, because bodies contain backticks and newlines that will not survive shell quoting on Windows.

`--parent` establishes the native sub-issue link, which is what feeds the board's hierarchy.

Then, per `.claude/lib/project-status.md`, for each new issue:
- add it to the project if `--parent` did not
- set **Type** to the agreed value
- set **Status → Proposed** (they are not ready to implement until groomed)
- inherit **Priority** from the parent when it has one
- leave **Iteration** unset — `/work` writes it when implementation actually starts. A child seeded with the parent's iteration at decompose time is a prediction, and it silently becomes wrong the moment the work slips.

Once every child exists and you have its number, record the approved ordering per `.claude/lib/issue-dependencies.md`. This has to come last — a dependency needs both issues to exist, and the API takes database ids you can only resolve after creation.

## 6. Report

List the created issues with their numbers and URLs, the dependency edges you created, and which ones you would groom first. Name the children that are startable right now — the ones nothing blocks. Flag any child you think is still too big.

If a child issue was created but a field write failed, say so explicitly and name the issue — a half-configured card on the board is worse than an obvious error, because it looks fine.
