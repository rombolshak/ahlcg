# Setting a project field on an issue

Shared procedure. `/groom`, `/work`, `/ship`, and `/decompose` all reference this rather than restating it.

Read the active client's project-field cache: `.claude/project-fields.json` in Claude Code or `.codex/project-fields.json` in Codex. If it is missing, run `/project-bootstrap` in Claude Code or `$ai-workflow project-bootstrap` in Codex first; do not guess IDs or silently skip the status update.

## Find the project item for an issue

An issue and its project card are different objects; field writes target the card (`item`), not the issue.

```bash
gh project item-list <projectNumber> --owner <owner> --format json --limit 500
```

Check the response's `totalCount` against the returned `items` count. If fewer items were returned, increase `--limit` to at least `totalCount` and retry, or paginate `ProjectV2.items` with `pageInfo`. Do not infer an absent card from a truncated list; if a complete lookup fails, stop that field update and report it.

Find the entry whose content repository and `content.number` match this repository and issue, and take its `id`. Issue numbers alone are not unique across project repositories.

If the issue has no card yet (it is not on the board), add it first:

```bash
gh project item-add <projectNumber> --owner <owner> --url https://github.com/rombolshak/ahlcg/issues/<n>
```

That returns the new item id.

## Write a single-select field

```bash
gh project item-edit \
  --project-id <projectId> \
  --id <itemId> \
  --field-id <fieldId> \
  --single-select-option-id <optionId>
```

All four IDs come from the active client's project-field cache plus the item lookup above.

## Write the Iteration field

Iteration option IDs are **not** cached in the project-field cache — only the field id is. Iterations are created and completed over time, so the ids must be read live:

```bash
gh api graphql -f query='
query {
  node(id: "<projectId>") {
    ... on ProjectV2 {
      field(name: "Iteration") {
        ... on ProjectV2IterationField {
          configuration {
            iterations { id title startDate duration }
            completedIterations { id title startDate duration }
          }
        }
      }
    }
  }
}'
```

`iterations` holds the current and future ones, `completedIterations` the past ones, newest first.

**The current iteration** is the entry whose window contains today — `startDate <= today < startDate + duration` days. In practice that is `iterations[0]`, but check the dates rather than assuming: between a completed iteration and the next start there is no current iteration at all, and picking `iterations[0]` blindly then files the work under an iteration that has not begun.

Write it with `--iteration-id`:

```bash
gh project item-edit \
  --project-id <projectId> \
  --id <itemId> \
  --field-id <iterationFieldId> \
  --iteration-id <iterationId>
```

**Set Iteration from when the work actually happens, not from when the issue was filed.** An issue groomed in March and implemented in August belongs to August's iteration — the field is a record of when effort was spent, and backdating it to the grooming date makes the board useless for that. If an item already carries an older iteration, overwrite it.

## Failure handling

- **"option not found"** or a missing field name → the board changed since bootstrap. Rerun the active client's project-bootstrap action and retry once.
- **Missing `project` scope** → tell the user to run `! gh auth refresh -s project`. Do not work around it.
- **Any other failure** → report it plainly and carry on with the rest of the command. A failed status write should never silently pass, but it also should not abort work that already succeeded. Say clearly which state the board is in versus what you intended.
