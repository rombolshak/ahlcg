# AI-Assisted Workflow

How this project is built with Claude Code. Issues are the spec store; slash commands move work through stages; you approve the plan before any code is written.

## The loop

```
/decompose 455   epic → child issues, linked as sub-issues, added to the board
/redecompose 142 parent that ALREADY has children → audit the breakdown, fill in thin bodies
/groom 57        thin issue → implementable spec, written back to the issue body
/work 57         issue → branch → PLAN GATE → implementation → verify → self-review
/ship            commit → push → PR that closes the issue
```

`/decompose` is for a parent with no children yet; `/redecompose` is for one that already has them — most of this board, decomposed before the spec template existed. It assesses whether each child still makes sense against the current code (already done? obsolete? wrong size? missing?) before writing any bodies, and preserves existing body text and comment history rather than overwriting it. Both propose everything for approval before touching a real issue.

Two supporting commands:

- `/verify` — run exactly what CI would run for whatever changed, and fix failures. Called automatically by `/work`; run it directly when you have edited something by hand.
- `/sync-docs` — fix claims in `docs/` that a change made untrue.

One setup command:

- `/project-bootstrap` — resolve the GitHub Project's field and option IDs into `.claude/project-fields.json`. Run once, and again whenever you add or rename a board field.

## Why it is shaped this way

**Issues hold the spec.** Everything an implementer needs lives in the issue body, folded down from its parents. Nothing important lives in a chat log. The test of a groomed issue is that someone with no memory of the conversation that created it can implement it correctly.

**Commands ask what you meant; they do not guess.** `/groom`, `/decompose`, and `/redecompose` explore the code first, then interview you about outcome, boundary, and depth before writing anything — because most issues here are a title and an empty body, and a title records that you had a thought, not what it was. The answers go into the issue body, so the question is asked once rather than re-guessed by everything downstream. See `.claude/lib/intent-interview.md`.

**Conventions live in `docs/`, and only in `docs/`.** The `implementer` and `reviewer` agents are told which doc governs their change and required to read it; they do not carry their own copy of the rules. A checklist pasted into a prompt goes stale silently and then two sources disagree with no way to tell which is current. If a rule changes, it changes in one file.

**One approval gate, at the plan.** `/work` explores, then stops and shows you a plan. Nothing is written until you approve. Reviewing an approach costs a minute; reviewing a wrong 400-line diff costs an afternoon.

**Green here means green in CI.** `/verify` mirrors the `dorny/paths-filter` split in `.github/workflows/ci.yml`, so it runs the frontend suite only when frontend files changed, and the same commands CI runs.

**Review is independent.** The `reviewer` agent reads the diff with fresh context and reports against three separate axes — acceptance criteria, the approved plan, and conventions — without the ability to edit. A reviewer that can quietly fix things is a reviewer you cannot trust to tell you everything.

## Model routing

Cheap models do the mechanical work; Opus is spent where judgment is.

| Stage | Model |
| --- | --- |
| `/decompose`, `/redecompose` | opus |
| `/groom` | sonnet |
| `/work` — planning | opus |
| `/work` — implementation | sonnet (`implementer` agent) |
| `/verify` | sonnet |
| `/ship` | haiku |
| `/sync-docs` | sonnet |
| `reviewer` agent | sonnet |

`/work` runs on Opus, plans, and hands the **approved plan file** to the Sonnet `implementer` — the plan file is the handoff artifact, so the decisions survive the model switch.

Each is a single `model:` line in the command or agent frontmatter. If a stage disappoints, change that one word. `/groom` on Sonnet is the most likely candidate for promotion to `opus`.

## Issue types

The board's `Type` field drives which command applies:

| Type | Command |
| --- | --- |
| `Initiative` → `Project` → `Epic` | `/decompose`, or `/redecompose` if it already has children |
| `Task` → `Sub-task` | `/work` (or `/decompose` if a task turned out too big) |
| `Bug`, `Feature Request` | `/work` |

`/work` refuses to implement a decomposable type, and `/decompose` points at `/work` for an implementable one, so neither silently does the wrong thing to an issue.

## Issue relations

Two different links, both native GitHub, both used:

| Relation | Means | Set by |
| --- | --- | --- |
| **parent / sub-issue** | *is part of* — the hierarchy your boards group by | `/decompose`, `/redecompose` |
| **Blocked by / Blocking** | *must come after* — ordering | `/decompose`, `/redecompose`, `/groom` |

They are independent: nesting an issue does not order it, and blocking it does not nest it. Siblings block each other; a child is never "blocked by" its own parent.

`/work` checks `blocked_by` before it starts and stops if anything there is still open, naming it. That is a stop, not a refusal — say the blocker is stale and it will offer to remove the edge rather than route around it silently.

The procedure and the API shape are in `.claude/lib/issue-dependencies.md`.

## Board status

Commands move cards so the board stays true without dragging:

| Command | Status becomes |
| --- | --- |
| `/decompose` (new children) | Proposed |
| `/redecompose` | Ready to dev if the body is now a real spec, else Proposed |
| `/groom` | Ready to dev |
| `/work` | In progress |
| `/ship` | Review |

Field IDs come from `.claude/project-fields.json`; the shared procedure is `.claude/lib/project-status.md`.

## Files

```
.claude/
├── commands/          the slash commands above
├── agents/
│   ├── implementer.md executes an approved plan (sonnet)
│   └── reviewer.md    read-only three-axis review (sonnet)
├── lib/
│   ├── project-status.md      shared board-mutation procedure
│   ├── issue-dependencies.md  reading and writing Blocked by / Blocking
│   ├── intent-interview.md    how commands ask what an issue is for
│   └── issue-spec-template.md the shape every implementable issue has
├── settings.json      permission allowlist (checked in)
└── project-fields.json  generated by /project-bootstrap
.github/ISSUE_TEMPLATE/ task.yml, epic.yml — same shape the commands read
```

## Setup

1. `gh` CLI installed and authenticated **with project scope**:
   ```
   gh auth refresh -s project
   ```
   Without it, every board write fails.
2. Run `/project-bootstrap` once to generate `.claude/project-fields.json`.

## Working with it

- **A one-line idea is a fine issue.** Create it with a title, run `/groom` later — grooming will ask you what you meant rather than inferring it. Blank issues are deliberately enabled.
- **Answer the interview properly; it is the cheapest step here.** Four questions before a breakdown costs a minute. The same misunderstanding found after the code is written costs the breakdown, the specs, and the diff.
- **If `/work` says an issue is too thin, believe it.** It is refusing to invent requirements — a plausible guess written as if it were the spec is the most expensive failure this workflow can produce.
- **Read the reviewer's findings, especially scope creep.** Unrequested changes are flagged even when they are improvements, because you approved a specific scope.
- **Never `--no-verify`.** Commands will not do it. `npm run shove` remains a human escape hatch, not a workflow step.

## What is deliberately not here

- **No GitHub Actions `@claude`.** Work happens in local sessions.
- **No background delegation.** The `implementer` subagent is synchronous, inside `/work`.
- **No enforcement hooks.** The husky hooks and CI already gate quality. Extra hooks are worth adding once real recurring mistakes are observed — building them pre-emptively is guessing.
