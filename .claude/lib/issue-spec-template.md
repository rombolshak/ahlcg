# Issue spec template

The body shape every implementable issue should have. `/groom` rewrites issues into this; `/decompose` creates children already in it; `/work` expects to read it.

The test of a good issue body: **someone with no memory of the conversation that created it can implement it correctly.** That is the entire standard. Context that lives only in your head or in a chat log is context that is lost.

```markdown
## Context

Why this exists and what it connects to. One or two paragraphs. Name the parent issue
and the part of the system it touches. If the reader needs to understand a game rule,
state it here rather than assuming — see docs/glossary.md for terms.

## Scope

What to build, described behaviourally. Not an implementation plan — that comes later
at the plan gate — but concrete enough that two people would build the same thing.

## Acceptance criteria

- [ ] Specific, checkable statements
- [ ] Each one independently verifiable by reading code or running something
- [ ] Phrased as observable behaviour, not as tasks ("the enemy panel shows the
      remaining health", not "update the enemy panel")

## Files likely touched

- `frontend/src/app/...` — what changes there
- Best-effort. Wrong guesses are cheap; a missing hint costs an exploration pass.

## Conventions that apply

Only the non-obvious ones relevant to this issue, with the doc that covers them.
Do not restate all of docs/frontend-conventions.md — link it.

## Test plan

What proves this works. Which specs to add or change, and any Storybook story.
If it genuinely cannot be unit-tested, say why.

## Out of scope

What a reasonable person might assume is included but is not — with the issue
number that covers it, if one exists. This section prevents scope creep more
reliably than any other part of the template.

## Open questions

Only if there are any. Things the user explicitly did not decide yet, recorded as
questions rather than resolved into a guess. Omit the section when everything is
settled.
```

Ordering lives in the issue's native **Blocked by** links, not in the body — see `.claude/lib/issue-dependencies.md`. Do not restate it as prose too; a duplicate that can drift is worse than a link that cannot.

## Rules when filling it in

- **Ground it in the real code.** Explore before writing. An acceptance criterion that assumes a service exists when it does not is worse than no criterion.
- **Respect what does not exist yet.** The backend implements authentication only; the game view renders `@domain/test/test-game-state`; there is no game API and no SignalR client. Never write criteria that assume otherwise — check `docs/architecture.md`.
- **Write down what the user told you, in their words.** The answers from `.claude/lib/intent-interview.md` are the highest-value content in the body, because they are the only part not recoverable from the code. The *Out of scope* section usually comes straight out of the boundary question.
- **Leave the checkboxes unchecked.** They get ticked when the work is done, not when it is specified.
- **Do not pad.** A small issue gets a short body. Omit a section rather than filling it with "N/A" noise — except *Out of scope*, which is most valuable exactly when the boundary is unclear.
