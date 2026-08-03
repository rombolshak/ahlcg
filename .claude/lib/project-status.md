# Setting a project field on an issue

Shared procedure. `/groom`, `/work`, `/ship`, and `/decompose` all reference this rather than restating it.

Read `.claude/project-fields.json` for the IDs. **If that file does not exist, run `/project-bootstrap` first** — do not guess IDs, and do not silently skip the status update.

## Find the project item for an issue

An issue and its project card are different objects; field writes target the card (`item`), not the issue.

```bash
gh project item-list <projectNumber> --owner <owner> --format json --limit 500
```

Find the entry whose `content.number` matches the issue number, and take its `id`.

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

All four IDs come from `.claude/project-fields.json` plus the item lookup above.

## Failure handling

- **"option not found"** or a missing field name → the board changed since bootstrap. Rerun `/project-bootstrap` and retry once.
- **Missing `project` scope** → tell the user to run `! gh auth refresh -s project`. Do not work around it.
- **Any other failure** → report it plainly and carry on with the rest of the command. A failed status write should never silently pass, but it also should not abort work that already succeeded. Say clearly which state the board is in versus what you intended.
