---
description: Commit and submit a reviewed layer with gh stack submit, then update its PR metadata.
argument-hint: [issue-number]
allowed-tools: Bash, Read, Write, Glob, Grep, AskUserQuestion
model: haiku
---

The issue is **#$1**, or derive it from the current branch and confirm against its approved layer record. Read `.claude/lib/stack-shipping.md` in full and follow it. It governs commit hooks, authorization, `gh stack submit`, per-layer PR metadata, issue linkage, and recovery. When called by work, return to its next-layer loop after successful submission.
