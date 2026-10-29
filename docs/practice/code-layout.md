# Code layout

Applies to every language and every project: frontend, backend and tests.

## At most six entries per folder

As a rule of thumb, a folder holds at most six entries, files and subfolders counted together. Generated folders such as `bin/`, `obj/` and `node_modules/` don't count.

**When a change would push a folder past six, the same change regroups it.** Plan the regrouping at the plan gate, not as an afterthought in the diff. Ship it as its own commit or stacked PR, with no behaviour change, so the move can be reviewed as a move.

- **Backend namespaces follow folders** (`Tablier.Engine.History.Cache`). Moves go through `git mv` so history follows the file.
- **Tests mirror the folders of the code they test.** `backend/Tablier/Engine/History/` is tested from `…IntegrationTests/Engine/History/`.
