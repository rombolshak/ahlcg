---
description: Turn a thin issue into an implementable spec and write it back to the issue body. Sets status to Ready to dev.
argument-hint: <issue-number>
allowed-tools: Bash, Read, Write, Glob, Grep, AskUserQuestion
model: sonnet
---

Turn issue **#$1** into a spec someone could implement without any of the context in your head.

Most issues in this repo are a title and an empty body (`#455 "Multiplayer"` is typical). Grooming is what makes "the issue contains everything needed to implement it" actually true.

## 1. Gather context

```bash
gh issue view $1 --json number,title,body,state,url
```

Then walk **up** the tree — a task inherits its epic's context, and that context should end up in the child rather than requiring a reader to climb the tree:

```bash
gh issue view $1 --json parent 2>/dev/null || gh api graphql -f query='
  query($owner:String!,$repo:String!,$number:Int!){
    repository(owner:$owner,name:$repo){
      issue(number:$number){ parent { number title body } }
    }
  }' -F owner=rombolshak -F repo=ahlcg -F number=$1
```

Read the parent's body, and its parent's, until you reach the top. Also check for existing sub-issues of `#$1` — if it already has children, it is a parent, not a task, and you probably want `/decompose` instead. Say so and stop.

## 2. Explore the actual code

This is the step that makes the difference between a useful spec and a plausible-sounding one. Do not skip it.

- `docs/README.md` — routing table; read the doc your issue maps to.
- `docs/architecture.md` — **what actually exists**. The backend is authentication only, the game view renders a hardcoded fixture, there is no game API and no SignalR client. Never write criteria that assume otherwise.
- Find and read the real files this would touch. Read a neighbouring implementation of the same kind.
- `docs/glossary.md` for any card-game term you are unsure of. Getting a rules term wrong makes the whole spec wrong.

Also read the issue's **dependencies** — what blocks it, and what it blocks — per `.claude/lib/issue-dependencies.md`. If it is blocked by something still open, say so now: grooming it is fine, but the user should know it is not startable.

## 3. Ask what it is for

Follow `.claude/lib/intent-interview.md`.

This is the step that separates a spec from a plausible-sounding paraphrase of the title. You have just read the code, so you can now ask questions the user could not have answered in the abstract — which is exactly why this comes after exploration and not before.

Do not skip it because the title seems self-explanatory. Titles always seem self-explanatory to the person who wrote them.

## 4. Write the spec

Follow `.claude/lib/issue-spec-template.md` exactly.

Fold in the inherited context from the parent chain, and the user's answers from the previous step, so the issue stands alone.

## 5. Show it, then write it

Show the proposed body and **wait for approval**. It is going into a permanent, human-visible record — it should not appear on GitHub unreviewed.

On approval:

```bash
gh issue edit $1 --body-file <tmpfile>
```

Write the body via a temp file in `$CLAUDE_JOB_DIR/tmp` (or the system temp dir) — never inline in the shell, since bodies contain backticks, quotes, and newlines that will not survive argument quoting on Windows.

Then set **Status → Ready to dev** following `.claude/lib/project-status.md`.

If the issue's `Type` field is unset, suggest one based on its scope and depth in the tree, but ask before setting it — type drives the user's board layout.

If grooming surfaced a real ordering constraint — this cannot start until something else lands — propose the dependency and, on approval, record it per `.claude/lib/issue-dependencies.md`. Only genuine blockers; see the rules there.

## 6. Report

State what you learned that was not in the original issue — separating what you found in the code from what the user told you. Note any dependency added or any open blocker, and anything you could not resolve. If something is still ambiguous after the interview, leave it recorded as an open question in the body rather than papering over it with a confident guess.
