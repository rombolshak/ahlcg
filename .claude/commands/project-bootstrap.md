---
description: Discover GitHub Project field and option IDs, cache them to .claude/project-fields.json. Run once at setup, and again whenever you add or rename a field.
argument-hint: [project-number]
allowed-tools: Bash, Read, Write
model: haiku
---

Discover this repo's GitHub Project structure and cache the IDs the other workflow commands need.

Project field mutations require opaque GraphQL node IDs. Re-querying them on every command is slow and noisy, and they never change — so they get resolved once and written to `.claude/project-fields.json`.

## Steps

**1. Check the token scope.**

```bash
gh auth status
```

If the scopes do not include `project`, stop and tell the user to run `gh auth refresh -s project` themselves (it is interactive — suggest they type `! gh auth refresh -s project`). Nothing below works without it.

**2. Find the project.** If `$1` was given, use it as the project number. Otherwise list and pick the one for this repo, asking the user if it is ambiguous:

```bash
gh project list --owner rombolshak --format json
```

**3. Read the fields:**

```bash
gh project field-list <number> --owner rombolshak --format json
```

**4. Write `.claude/project-fields.json`** in this shape — every single-select option gets its ID recorded, because the status transitions in `/groom`, `/work`, and `/ship` need them:

```json
{
  "owner": "rombolshak",
  "projectNumber": 0,
  "projectId": "PVT_...",
  "fields": {
    "Status":   { "id": "PVTSSF_...", "options": { "Icebox": "abc123", "Proposed": "...", "Ready to dev": "...", "In progress": "...", "Review": "...", "Waiting deploy": "...", "Done": "..." } },
    "Type":     { "id": "PVTSSF_...", "options": { "Initiative": "...", "Project": "...", "Epic": "...", "Task": "...", "Sub-task": "...", "Feature Request": "...", "Bug": "..." } },
    "Priority": { "id": "PVTSSF_...", "options": {} },
    "Severity": { "id": "PVTSSF_...", "options": {} },
    "Iteration":{ "id": "PVTIF_...", "dataType": "ITERATION" }
  }
}
```

Use the **exact** field and option names the API returns, not the ones in this template — they are illustrative. If a field or option name differs, record what actually exists and tell the user which names you found, so the other commands can be adjusted to match.

**5. Report** the field names and option values you discovered, and confirm the file was written.

## Notes for whoever reads this file later

- These IDs are not secrets. The file is checked in deliberately, so the workflow works on a fresh clone.
- If a status write later fails with an "option not found" error, the board changed — rerun this command.
