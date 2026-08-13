---
description: Audit an existing breakdown — assess whether the current children still make sense, then fill in thin bodies. For parents decomposed before the spec template existed.
argument-hint: <issue-number>
allowed-tools: Bash, Read, Write, Glob, Grep, AskUserQuestion
model: opus
---

Take issue **#$1**, which already has children, and bring its breakdown up to standard.

Two jobs, in this order — structure first, because there is no point writing a careful spec for a child that should not exist:

1. **Is the decomposition still right?** It was made at some point in the past, against a codebase that has since moved.
2. **Do the surviving children have implementable bodies?** Most existing issues are a title and an empty body.

## 1. Read the whole subtree

```bash
gh issue view $1 --json number,title,body,state,url --comments
```

Then the children:

```bash
gh api graphql -f query='
  query($o:String!,$r:String!,$n:Int!){
    repository(owner:$o,name:$r){
      issue(number:$n){
        subIssues(first:50){ totalCount nodes{ number title state body } }
      }
    }
  }' -F o=rombolshak -F r=ahlcg -F n=$1
```

For each child, read its body **and its comments** — `gh issue view <n> --comments`. Comments are where the real thinking usually lives on older issues, and losing it is the main risk of this command.

If a child has children of its own, note it and treat it as a parent — do not flatten the tree. Suggest running this command on it separately rather than reaching two levels down in one pass.

Read the existing dependency edges across the subtree, per `.claude/lib/issue-dependencies.md`. On an older breakdown these are the most likely thing to have gone stale: a blocker that has since been closed, or an ordering that no longer reflects how the code turned out.

If `#$1` has **no** children, this is the wrong command — use `/decompose $1`.

## 2. Ground the audit in the current code

Read `docs/architecture.md` and the docs for the areas involved, then look at the actual code. You are checking each child against reality:

- **Already done?** The work may have landed under a different issue. Check the code before assuming a child is outstanding.
- **Obsolete?** The design may have moved on since it was written.
- **Wrong altitude?** Too big to implement in one branch, or so small it should merge into a sibling.
- **Overlapping?** Two children that would touch the same files in conflicting ways.
- **Missing?** Work the parent implies that no child covers — tests, translations, Storybook stories, migrations, docs.
- **Mis-ordered?** A `Blocked by` edge pointing at something already closed, or an ordering the code has since contradicted. Also the reverse: two children that clearly must land in an order nobody recorded.

## 3. Ask what the parent is actually for

Follow `.claude/lib/intent-interview.md`.

You now know what the children say and what the code says. What is missing is what the user wants — and on a breakdown made months ago, the honest answer may be that the intent has moved since. That is worth finding out **before** you propose verdicts, because "close this, it is obsolete" and "keep this, it is still the plan" are the same evidence read against different intentions.

Ask about **boundary and depth**, as `/decompose` does, plus one this command specifically needs: is the original shape of this breakdown still what they want, or should it be rethought? Do not decide that on their behalf.

Where a child carries hand-written body text or a comment thread, treat that as the user's stated intent and quote it back rather than asking them to restate it.

## 4. Propose, then wait

Present a table: every existing child, and one of —

| Verdict | Meaning |
| --- | --- |
| **keep** | Structurally fine; body may still need filling in |
| **fill** | Keep, and write a proper spec body |
| **split** | Too big — propose the replacement children |
| **merge** | Fold into a named sibling |
| **close** | Done or obsolete — say which, with evidence |
| **new** | A gap in the breakdown |

Give a one-line reason for anything that is not `keep` or `fill`.

List proposed dependency changes separately — edges to add, and edges to remove because the blocker is closed or no longer real. Removing a stale blocker is often the highest-value thing this command does: it turns work that looks blocked back into work the user can pick up.

**Wait for approval.** These are real issues on a real board, some carrying history. Closing or rewriting one that should have been left alone is expensive to undo — and `close` in particular is a judgement the user should make, not you.

## 5. Execute the approved changes

**Filling bodies — preserve what is there.** This is the part most likely to destroy something valuable. The existing body and comments may hold decisions, links, or rules details that are not recoverable from anywhere else.

- Fold existing content into the new spec rather than replacing it. If a body has a stray note that does not fit a template section, keep it under a `## Notes` heading rather than dropping it.
- Never discard a hand-written body. If you genuinely cannot fit something in, quote it back to the user and ask.
- Follow `.claude/lib/issue-spec-template.md` for the structure.
- Write via a temp file (`$CLAUDE_JOB_DIR/tmp` or system temp): `gh issue edit <n> --body-file <tmpfile>`. Never inline — bodies contain backticks and newlines that will not survive shell quoting on Windows.

**New children:** `gh issue create --title "..." --body-file <tmpfile> --parent $1`

**Splits:** create the replacements, then close the original with a comment naming them. Do not silently repurpose the original issue into one of its own children — the history becomes unreadable.

**Closes:** always leave a comment saying why, and link the issue or commit that superseded it, before `gh issue close <n>`.

**Merges:** move the content into the surviving sibling first, then close the absorbed one with a comment pointing at it.

Then set fields per `.claude/lib/project-status.md`:

- children with a real spec body → **Status: Ready to dev**
- children still thin, or only structurally agreed → **Status: Proposed**
- `Type` one level below the parent (`Project`→`Epic`, `Epic`→`Task`, `Task`→`Sub-task`); `Bug` for defects at any depth
- inherit `Priority` from the parent where it has one and the child does not
- leave `Iteration` alone — `/work` owns it, and sets it when implementation starts

Then apply the approved dependency changes per `.claude/lib/issue-dependencies.md`. Do this after any splits and closes, so edges point at issues that still exist. When you close a child, check whether anything was blocked by it and remove the dead edge — GitHub leaves it in place, and a closed blocker still reads as "blocked" at a glance.

## 6. Report

- Each child and what happened to it.
- Anything created or closed, with numbers and URLs.
- Dependency edges added or removed, and which children are startable now.
- Content you carried across from an old body or comment thread that you thought was worth preserving.
- Which children you would groom or implement first.
- Anything you were unsure about and left alone. Leaving something untouched and saying so is always better than a confident wrong edit to an issue with history.
