# AI-Assisted Workflow

Issues are the spec store. Codex uses `$ai-workflow <action> [argument]`; Claude Code uses `/action [argument]`. Both follow the shared work cycle in `.claude/lib/work-cycle.md` and shipping procedure in `.claude/lib/stack-shipping.md`.

Explicit standalone requests for documentation corrections (including documentation typos) and workflow-instruction maintenance use focused checks and need no new issue or design, wording or implementation-plan gate. Product UI copy corrections still require wording. This path does not authorize application behavior changes or publication. Behavioral bug fixes follow the issue cycle, usually as one layer; omit design and wording only when no UI or copy changes trigger them.

## The loop

Groom the parent before decomposition, then groom and work its actionable children:

```text
Codex:       $ai-workflow groom 455
             $ai-workflow decompose 455
             $ai-workflow groom 57
             $ai-workflow work 57
Claude Code: /groom 455 -> /decompose 455 -> /groom 57 -> /work 57
```

Use redecompose after grooming a parent that already has children. Grooming explores real code, audits existing claims, then probes unresolved intent and consequences until the scope and criteria are clear. The approved spec and grooming record live in the issue body. Parent grooming defines the boundary; child grooming makes each implementation spec stand alone.

## Work phases and approvals

1. Validate dependencies, independently audit the issue, and explore actual code.
2. For changes to UI appearance or interaction, delegate preparation or inspection to the Codex figma-designer (Claude uses its native tools) for Figma mockups and obtain explicit approval of the relevant frames and revision. Do this before implementation planning. Placeholder copy is provisional. Internal refactors with no UI change state why this gate is skipped.
3. Present a concrete implementation plan, split into smaller reviewable layers where practical. Include files, criteria coverage, tests, and copy semantics and constraints, but no proposed UI wording. Wait for approval and establish publication authorization.
4. For each layer, run wording for all new or changed user-visible copy. The wordsmith proposes; the human chooses; the caller writes English resources and translator notes before implementation.
5. The implementer receives the complete approved plan, current layer, issue criteria, approved mockups, and prepared resource manifest. It binds keys and writes code; it never authors or changes copy. Missing or ill-fitting copy returns to wording.
6. Verify and independently review requirements, plan/design adherence, code quality and conventions, and security. Review the full layer against its recorded base, including staged, unstaged, and untracked files. Allow two fix passes after the initial review; unresolved defects then go to the human. No shipping with open defects.
7. After clean review, the Codex docs-sync agent updates affected docs; the caller checks the resulting claims. Claude uses its native sync-docs command.
8. Delegate one layer to the Codex shipper with publication authorization and verification/review evidence (Claude uses its native ship command). Commit with hooks and use `area: what changed` for both commit subjects and PR titles, with lowercase imperative wording and no trailing period. The area is free-form; this is not Conventional Commits. Submit using `gh stack submit --auto --open`; every submitted PR must be Ready (`isDraft=false`). Update and read back this layer's PR title/body to verify the naming rule and readiness, as required by `.claude/lib/stack-shipping.md`, and record progress. Only then branch and implement the next approved layer. Later PRs target their predecessor. Intermediate PRs reference the issue; only the final layer closes it.

Record approved designs, plan, selected copy, base commits, layer progress, and PR URLs in the issue through authorized writes so work can resume without chat history. Changed design or scope returns to the relevant approval gate. Existing authorization persists; tool/sandbox permissions still apply. No automatic merges or hook bypasses.

Record pre-existing changes and isolate the layer from unrelated files; unrelated dirty files may coexist. Use a separate worktree or resolve overlapping edits with the user. Do not stash, discard or include someone else's work. If Figma is unavailable, complete independent exploration and request access or an explicit exception with an agreed reviewable alternative; do not silently waive the design gate.

## Supporting actions and configuration

- `wording`: choose copy independently; load the copy standard on every run. English only.
- `verify`: derive applicable checks from the live CI workflows; distinguish local results from hosted checks.
- `sync-docs`: fix false claims and directly affected omissions. Work calls this after clean review for every layer.
- `ship`: resume submission of an already approved, verified, reviewed layer; work calls it automatically when publication is authorized.
- `project-bootstrap`: resolve project fields into `.codex/project-fields.json` or `.claude/project-fields.json`. Re-run after field changes.

Codex action references live in `.agents/skills/ai-workflow/`, and custom agents in `.codex/agents/`. Claude commands and agents live in `.claude/commands/` and `.claude/agents/`. Codex delegates to issue-auditor, figma-designer, wordsmith, implementer, reviewer, docs-sync, and shipper; every report is awaited. The main conversation owns grooming, decomposition, planning, approval gates, fix budgets, and continuation. Claude retains its existing agent roles, native commands, and frontmatter models. Conventions live in the relevant docs, not duplicated agent checklists.

Codex safeguards in `.codex/rules/project.rules` block dangerous command forms and prompt for outward writes when trusted. They supplement sandbox and runtime approval rules. Claude's command allowlist remains client-specific. Neither client may bypass hooks with `--no-verify` or use `npm run shove`.

## Codex model routing

The project default in `.codex/config.toml` is the main orchestrator model. Each role pins its own model and reasoning effort in `.codex/agents/<role>.toml`:

| Role | Model | Effort |
| --- | --- | --- |
| Main: groom, decompose, plan, coordinate | `gpt-6.1-sol` | `high` |
| figma-designer | `gpt-6.1-terra` | `medium` |
| issue-auditor | `gpt-6-luna` | `high` |
| wordsmith | `gpt-6.1-sol` | `high` |
| implementer | `gpt-6.1-terra` | `high` |
| reviewer | `gpt-6.1-sol` | `medium` |
| docs-sync | `gpt-6.1-sol` | `medium` |
| shipper | `gpt-6-luna` | `medium` |

Project config applies in trusted repositories; an explicit session/CLI model selection can override the main default. Applying a file does not change an already-running conversation's model. Start a new session or select Sol/high for main orchestration when needed. Model-specific delegation uses fresh context and complete phase inputs. If a configured role/model is unavailable, complete independent preparation, report the blocked phase and resume after the user explicitly selects an available role/model or changes configuration. Never claim an independent phase ran when it did not. Agent instructions limit their responsibilities; all inherit the parent's actual permissions and available tools.

The agent definitions remain in the host's conventional flat discovery directory; the six-entry code-folder guideline does not reorganize this configuration registry.

## Issue types

The board hierarchy is five levels deep, and every parent/child edge moves exactly one level:

```
Initiative → Project → Epic → Task → Sub-task
```

**No level skipping — in particular, a `Task` is never a direct child of a `Project`.** If a Project's remaining work is one task's worth, the answer is an Epic in between, or it was not a Project. The rule exists so the board can be grouped and filtered by level at all; a hierarchy that holds most of the time cannot be.

`Bug` sits outside the ladder — a defect is a `Bug` at whatever depth it is found.

**Actionable types — the ones where code gets written — are `Task`, `Sub-task`, and `Bug`.** Nothing else goes to `/work`.

| Type | Command |
| --- | --- |
| `Initiative` → `Project` → `Epic` | `/decompose`, or `/redecompose` if it already has children |
| `Task` → `Sub-task` | `/work` (or `/decompose` if a task turned out too big) |
| `Bug` | `/work` |
| `Feature Request` | Intake only — `/decompose` it, or retype it as `Task`/`Bug` first |

`Feature Request` records that someone wants something, not what to build, so `/work` stops on it and asks for a retype. It is a front door, not a work item.

`/work` refuses to implement a decomposable type, and `/decompose` points at `/work` for an actionable one, so neither silently does the wrong thing to an issue.

## Issue relations

Two different links, both native GitHub, both used:

| Relation | Means | Set by |
| --- | --- | --- |
| **parent / sub-issue** | *is part of* — the hierarchy your boards group by | `/decompose`, `/redecompose` |
| **Blocked by / Blocking** | *must come after* — ordering | `/decompose`, `/redecompose`, `/groom` |

They are independent: nesting an issue does not order it, and blocking it does not nest it. Siblings block each other; a child is never "blocked by" its own parent.

`/work` checks `blocked_by` before it starts and stops if anything there is still open, naming it. That is a stop, not a refusal — say the blocker is stale and it will offer to remove the edge rather than route around it silently.

The procedure and API shape are in `.claude/lib/issue-dependencies.md`.

## Board status

Commands move cards so the board stays true without dragging:

| Action | Status becomes |
| --- | --- |
| `/decompose` (new children after parent grooming) | Proposed |
| `/redecompose` | Ready to dev if the body is now a real spec, else Proposed |
| `/groom` | Ready to dev |
| `/work` after plan approval | In progress |
| work submits each layer (or standalone ship) | Review, through PR automation |

Field IDs come from `.claude/project-fields.json` in Claude Code and `.codex/project-fields.json` in Codex; the shared procedure is `.claude/lib/project-status.md`.

## Files

```
.claude/
├── commands/          the slash commands above
├── agents/
│   ├── issue-auditor.md read-only check of an issue body against the code (sonnet)
│   ├── implementer.md executes an approved plan (sonnet)
│   ├── reviewer.md    read-only requirements, design, quality, and security review (sonnet)
│   └── wordsmith.md   read-only copy variants for new strings (opus)
├── lib/
│   ├── work-cycle.md          shared per-layer work procedure
│   ├── stack-shipping.md      shared stack submission procedure
│   ├── project-status.md      shared board-mutation procedure
│   ├── issue-dependencies.md  reading and writing Blocked by / Blocking
│   ├── intent-interview.md    how commands ask what an issue is for
│   └── issue-spec-template.md the shape every implementable issue has
├── settings.json      permission allowlist (checked in)
└── project-fields.json  generated by /project-bootstrap
.github/ISSUE_TEMPLATE/ task.yml, epic.yml — same shape the commands read
```

Codex equivalents:

```
.agents/skills/ai-workflow/     workflow entry point and action references
.codex/agents/                  seven model-pinned workflow roles
.codex/project-fields.json     generated by the project-bootstrap action
```

## Setup

1. `gh` CLI installed and authenticated **with project scope**:
   ```
   gh auth refresh -s project
   ```
   Without it, every board write fails.
2. Ensure the `gh stack` extension is installed and its help is available, and connect Figma for UI work.
3. Run `project-bootstrap` once for each client: `/project-bootstrap` in Claude Code or `$ai-workflow project-bootstrap` in Codex. This generates that client's project-field cache.

## Working with it

- **A one-line idea is a fine issue.** Create it with a title, run `/groom` later — grooming will ask you what you meant rather than inferring it. Blank issues are deliberately enabled.
- **Answer the interview properly; it is the cheapest step here.** Clarifying the outcome and boundaries before a breakdown saves rework. The same misunderstanding found after the code is written costs the breakdown, the specs, and the diff.
- **If `/work` says an issue is too thin, believe it.** It is refusing to invent requirements — a plausible guess written as if it were the spec is the most expensive failure this workflow can produce.
- **When the audit says the body is stale, the body is still stale on GitHub.** `/work` plans around it and tells you; it does not rewrite the issue, because that is your record. If the drift was substantial, re-run `/groom` afterwards so the next reader is not misled by the same text.
- **Read the reviewer's findings, especially scope creep.** Unrequested changes are flagged even when they are improvements, because you approved a specific scope.
- **Never `--no-verify`.** Commands will not do it. `npm run shove` remains a human escape hatch, not a workflow step.

## What is deliberately not here

- **No GitHub Actions `@claude`.** Work happens in local sessions.
- **No fire-and-forget delegation.** Each custom agent — `issue-auditor`, `implementer`, `reviewer`, `wordsmith` — is awaited by the workflow before it continues.
- **No enforcement hooks.** The husky hooks and CI already gate quality. Extra hooks are worth adding once real recurring mistakes are observed — building them pre-emptively is guessing.
