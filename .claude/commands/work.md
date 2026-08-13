---
description: Implement an issue end to end — branch, plan gate, Sonnet implementation, verification, self-review. Stops before shipping.
argument-hint: <issue-number>
allowed-tools: Bash, Read, Write, Edit, Glob, Grep, Agent, EnterPlanMode, ExitPlanMode, TaskCreate, TaskUpdate
model: opus
---

Implement issue **#$1**, from branch to reviewed diff. You stop before committing — `/ship` is a separate, deliberate step.

You are running on Opus because the planning is the part worth paying for. The implementation is handed to Sonnet once the plan is approved.

## 1. Read the issue and its ancestors

```bash
gh issue view $1 --json number,title,body,state,url
```

Walk up the parent chain for inherited context (same approach as `/groom`).

**If its `Type` is `Initiative`, `Project`, or `Epic` — stop.** Those exist to be broken down, not implemented; point the user at `/decompose $1`. Implementable types are `Task`, `Sub-task`, `Bug`, and `Feature Request`.

**If the body is empty or too thin to implement from — stop.** Tell the user to run `/groom $1` first. Do not invent requirements to fill the gap: a plausible guess written as if it were the spec is the most expensive failure mode in this whole workflow, because everything downstream trusts it.

Judge thinness by whether you could write acceptance criteria yourself without guessing. If you could not, it is too thin.

**Check whether it is blocked.** Per `.claude/lib/issue-dependencies.md`:

```bash
gh api repos/rombolshak/ahlcg/issues/$1/dependencies/blocked_by --jq '.[] | {number, title, state}'
```

If anything in that list is still open, **stop and say so**, naming the issues. Someone recorded that ordering for a reason, and the usual consequence of ignoring it is building against an interface that does not exist yet.

This is a stop, not a refusal: the dependency may be stale, or the user may know it does not matter here. Ask, and proceed if they say so. If it is genuinely stale, offer to remove the edge rather than working around it silently — a blocker nobody trusts is worse than none.

## 2. Set up

Per `.claude/lib/project-status.md`, set both:

- **Status → In progress**
- **Iteration → the current iteration**, resolved from today's date against the live iteration configuration. Set it even if the item already has one — an issue groomed in a past iteration and implemented now belongs to the current one, and the stale value is exactly what needs overwriting.

This is the point where Iteration gets written, because starting work is when the iteration becomes a fact rather than a guess. Do not set it at grooming time.

Branch off up-to-date `main`, matching the existing convention (`210-assets-area`, `48-actions-selector`):

```bash
git checkout main && git pull
git checkout -b $1-<short-kebab-slug-from-title>
```

If the working tree is dirty, stop and ask — do not stash or discard someone's work.

## 3. Explore before planning

- `docs/README.md` routes you to the right doc. **Any frontend change: read `docs/frontend-conventions.md`.** No exceptions.
- `docs/architecture.md` for what actually exists — backend is auth only, the game view is fixture-driven, there is no game API or SignalR client.
- Read the real files you will change, plus a neighbouring implementation of the same kind and its spec. The local idiom matters more than any doc.

## 4. Plan gate — the approval point

Call `EnterPlanMode`, write the plan to the plan file, and call `ExitPlanMode`.

The plan should name the files to change and what changes in each, the tests to add, and any decision where you had a real choice — stated as a decision, not buried. If something in the issue is ambiguous, resolve it here with `AskUserQuestion` rather than picking silently.

**Nothing is written to the codebase until the user approves.** That gate is the point of this workflow.

## 5. Implement — hand off to Sonnet

Once approved, delegate to the `implementer` agent (`subagent_type: "implementer"`, `run_in_background: false`). Pass it:

- the plan file path
- the issue number and its full body
- the branch name

The plan file is the handoff artifact — it carries the approved decisions across the model switch. Do not re-summarise it into the prompt; point at it.

**Do not implement it yourself.** The Opus/Sonnet split is deliberate and is what keeps this affordable to run often.

If the implementer reports the plan is unbuildable, do not paper over it — bring it back to the user with what it found and what you would do instead.

## 6. Verify

Follow `.claude/commands/verify.md`. Green means green in CI; do not proceed on a failing tree.

## 7. Self-review

Invoke the `reviewer` agent (`subagent_type: "reviewer"`, `run_in_background: false`) with the issue number and body, the plan file path, and `git diff main...HEAD`.

If it reports unmet acceptance criteria, unexplained deviations, or convention violations, send them back to `implementer` for a fix pass and re-review. **Bound this to two rounds.** After that, stop and report what is still open rather than looping — an unresolved finding the user knows about beats a silent one.

Scope creep findings are for the user to judge, not for you to quietly accept.

## 8. Report and stop

Give the user:

- what changed, file by file
- the reviewer's findings, in full — including anything unresolved
- the actual verification results, with real output if anything failed
- what to do next (`/ship`, or a specific fix)

Do not commit, push, or open a PR. Do not describe anything as done that you have not seen pass. If the acceptance criteria are not all met, say which ones are not — a diff that looks finished but is not is worse than an obviously unfinished one.
