---
description: Audit, approve UI mockups and plan, then implement, review, sync docs, and submit each layer as a stacked PR.
argument-hint: <issue-number>
allowed-tools: Bash, Read, Write, Edit, Glob, Grep, Agent, SendMessage, AskUserQuestion, EnterPlanMode, ExitPlanMode, TaskCreate, TaskUpdate
model: opus
---

Run issue **#$1** using `.claude/lib/work-cycle.md`. Read that shared procedure in full before acting. It governs the Figma and plan gates, per-layer wording and implementation, bounded review, docs sync, and stack submission.

Use `issue-auditor`, `wordsmith`, `implementer`, and `reviewer` synchronously. Keep the complete approved plan in the plan file and pass its path to agents that need it. EnterPlanMode and ExitPlanMode implement the plan gate only after UI mockup approval; they do not replace the Figma gate.

Read `.claude/commands/wording.md`, `verify.md`, `sync-docs.md`, and `ship.md` at their phases. Project field IDs come from `.claude/project-fields.json`.
