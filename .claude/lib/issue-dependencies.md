# Issue dependencies (Blocked by / Blocking)

Shared procedure. `/decompose`, `/redecompose`, `/groom`, and `/work` all reference this.

These are **native GitHub issue dependencies**, not a project field and not the parent/sub-issue link:

- **parent / sub-issue** = *is part of* — hierarchy, drives the board's tree.
- **blocked by / blocking** = *must come after* — ordering, drives what you can pick up next.

A child can be both. They are independent relations and must not be conflated: making an issue a sub-issue does not order it, and blocking it does not nest it.

## Read

```bash
gh api repos/rombolshak/ahlcg/issues/<n>/dependencies/blocked_by --jq '.[] | {number, title, state}'
gh api repos/rombolshak/ahlcg/issues/<n>/dependencies/blocking   --jq '.[] | {number, title, state}'
```

**Always pass `--jq`.** The raw response embeds the full repository object for every linked issue — hundreds of lines per dependency, for four useful fields.

A cheap existence check, without listing anything:

```bash
gh api repos/rombolshak/ahlcg/issues/<n> --jq '.issue_dependencies_summary'
# {"blocked_by":2,"blocking":0,"total_blocked_by":2,"total_blocking":0}
```

## Write

The API takes the issue's **database id**, not its number. Resolve it first:

```bash
BLOCKER_ID=$(gh api repos/rombolshak/ahlcg/issues/<blocker-number> --jq .id)

gh api --method POST \
  repos/rombolshak/ahlcg/issues/<blocked-number>/dependencies/blocked_by \
  -F issue_id=$BLOCKER_ID
```

Read that as: *`<blocked-number>` is blocked by `<blocker-number>`.* Getting the direction backwards produces a plausible-looking graph that is wrong, so state the sentence out loud before running it.

To remove one:

```bash
gh api --method DELETE \
  repos/rombolshak/ahlcg/issues/<blocked-number>/dependencies/blocked_by/$BLOCKER_ID
```

There is only a `blocked_by` write endpoint. To record "A blocks B", write it as "B is blocked by A".

Write `--method` **before** the path, exactly as above. `.claude/settings.json` auto-allows `gh api repos/…` as a read and prompts on `gh api --method …`; putting the flag after the path smuggles a mutation past a permission rule that exists to catch it.

## Rules

- **Only real blockers.** A dependency means the work genuinely cannot start — a file that must exist first, an API the other issue creates. "Would be tidier in this order" is a note in the body, not a dependency. Every false blocker hides work that was actually available.
- **Between siblings, not up the tree.** A child is not blocked by its own parent; the parent contains it. Order siblings against each other.
- **Never create a cycle.** Before adding an edge, check the blocker's own `blocked_by` chain. GitHub does not always stop you, and a cycle makes every issue in it permanently unstartable.
- **Propose before writing**, alongside the rest of the breakdown. Dependencies change what the user can work on tomorrow.

## Failure handling

- **422 "Target issue has already been taken"** — the dependency already exists. Not an error; carry on.
- **404 on the endpoint** — the issue number is wrong, or you used a number where the id belongs.
- Anything else: report it plainly and continue with the rest of the command, saying which links were and were not created. A half-built dependency graph that is described as complete is worse than an obvious failure.
