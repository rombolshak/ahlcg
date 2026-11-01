# Code layout

Applies to every language and every project: frontend, backend and tests.

## At most six entries per folder

As a rule of thumb, a code folder holds at most six entries, files and subfolders counted together. Generated output (`bin/`, `obj/`, `node_modules/`), generated migrations, translation catalogs and tool-discovery registries are exceptions; their layouts follow their owning tools.

**When adding entries would take a compliant code folder past six, plan a regrouping.** Existing oversized folders do not require unrelated restructuring for a small fix. For additions to an already oversized folder, choose a local grouping for the new responsibility and explain any exception in the plan; do not silently broaden the change. Review a needed regrouping as its own commit or stacked PR with no behaviour change.

- **Backend namespaces follow folders** (`Tablier.Engine.History.Cache`). Moves go through `git mv` so history follows the file.
- **Tests mirror the folders of the code they test.** `backend/Tablier/Engine/History/` is tested from `…IntegrationTests/Engine/History/`.
