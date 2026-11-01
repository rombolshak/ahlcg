# Work an actionable issue

Run issue #$1 using `.claude/lib/work-cycle.md`. Read that shared procedure in full before acting. It governs the Figma and plan gates, per-layer wording and implementation, bounded review, docs sync, and stack submission.

Use the configured Codex `issue-auditor`, `figma-designer`, `wordsmith`, `implementer`, `reviewer`, `docs-sync`, and `shipper` agents synchronously. Pass the complete approved plan text; do not depend on a Claude plan file. Use Codex delegation and follow-up tools. The caller retains grooming, planning, all human approval gates, fix budgets, and next-layer continuation. Use the configured model/effort for each role; spawn model-specific agents with fresh context and the full handoff inputs.

Read this skill's `references/change/wording.md`, `references/change/verify.md`, `references/maintenance/sync-docs.md`, and `references/maintenance/ship.md` when each phase is reached. Project field IDs come from `.codex/project-fields.json`.
