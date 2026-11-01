---
name: ai-workflow
description: Run this repository's issue-driven development workflow. Use for grooming, decomposing, planning and implementing, verifying, reviewing, syncing docs, choosing copy, bootstrapping GitHub Projects, or shipping work tracked as GitHub issues.
---

# Issue workflow

Use this skill when the user asks to run an issue workflow action in this repository.

Invoke it as `$ai-workflow <action> [argument]`. Read the matching file in `references/` in full before acting:

| Action | Reference | Argument |
| --- | --- | --- |
| `decompose` | `references/issues/decompose.md` | issue number |
| `groom` | `references/issues/groom.md` | issue number |
| `project-bootstrap` | `references/issues/project-bootstrap.md` | optional project number |
| `redecompose` | `references/issues/redecompose.md` | issue number |
| `ship` | `references/maintenance/ship.md` | optional issue number |
| `sync-docs` | `references/maintenance/sync-docs.md` | optional area or file |
| `verify` | `references/change/verify.md` | none |
| `wording` | `references/change/wording.md` | brief for the strings |
| `work` | `references/change/work.md` | issue number |

## Codex adaptation

These procedures preserve the project's Claude workflow while translating its mechanics to Codex:

- The reference files are the detailed procedure. Claude-only frontmatter was removed. Never try to invoke Claude slash commands or Claude-specific tools from Codex.
- Ask interview and approval questions in the conversation. For UI changes, obtain Figma mockup approval before implementation planning. Then show the layer plan and stop before edits; after approval run wording, implementation, bounded review, docs sync, and stack submission for each layer as defined in `.claude/lib/work-cycle.md`.
- Use Codex custom agents in `.codex/agents/` for the named `issue-auditor`, `wordsmith`, `figma-designer`, `implementer`, `reviewer`, `docs-sync`, and `shipper` roles. Delegate to them when the procedure calls for that role, provide the complete required inputs, and wait for their result before proceeding. If delegation is unavailable, explain that and do not silently claim an independent review or audit occurred.
- The main conversation owns interviews, approvals, and the layer loop. Its project default is Astra/medium in `.codex/config.toml`; each agent pins its model and effort in its own TOML. Do not silently substitute models or perform a delegated phase yourself if a configured role/model is unavailable; report the blocker. Use fresh context plus complete phase inputs for model-specific agents.
- Pass the approved plan text to `implementer`; it does not need a Claude plan-file handoff.
- The project-field cache for this skill is `.codex/project-fields.json`. The separate Claude setup remains under `.claude/`.
- Preserve authorization boundaries and honor permission already given. Issue/spec approval gates still apply. The work plan gate establishes whether per-layer commit, `gh stack submit`, and PR metadata updates are authorized; do not ask again once they are. If missing, complete the reviewed layer before requesting publication approval. Tool and sandbox approvals still apply. Never bypass hooks or use `--no-verify`.

Commands in the references are written as examples and may use Bash syntax; adapt their syntax to the active Codex shell while preserving arguments and effects.

## Shared workflow references

The shared procedures in `.claude/lib/` hold the work cycle, stack shipping, intent interview, issue template, dependency, and status rules. They are portable repo documentation used by both clients; keep issue bodies as the durable spec store.
