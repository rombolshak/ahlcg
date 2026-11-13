# Work cycle

Shared procedure for Codex `$ai-workflow work <id>` and Claude Code `/work <id>`. Read in full. Use the current client's tools and named agents; await every delegated result. The caller orchestrates, the implementer writes code, the wordsmith proposes copy, and the reviewer reports without editing. In Codex, delegate Figma preparation to `figma-designer`, documentation edits to `docs-sync`, and one-layer submission to `shipper`; Claude Code keeps its native command execution for those three phases. The caller owns every human approval, the fix budget, and layer continuation. Await each agent report; missing roles or unavailable configured models are blockers, not permission to silently change models or execute a delegated phase yourself.

## Scope and fallbacks

This cycle applies to issue-driven feature and bug work. An explicit standalone request for documentation corrections (including documentation typos) or workflow-instruction maintenance can be completed directly with focused checks; it needs no new issue, Figma, wording, or implementation-plan gate. Report the changed files and validation. Product UI copy corrections still require wording. This path does not authorize application behavior changes or publication. A narrow behavioral bug still follows this cycle, usually as one layer; skip design and wording only when their triggering changes are absent.

If a configured role/model is unavailable, finish independent preparation and report the blocked phase. Resume after the user explicitly selects an available role/model or changes the configuration; never claim an independent phase ran when it did not. If Figma is unavailable, finish non-design exploration and ask for access or an explicit exception with an agreed reviewable alternative. Neither absence silently waives approval.

## 1. Validate, audit, and explore

Read the issue, ancestors, and native dependencies using `.claude/lib/issue-dependencies.md`. Only Task, Sub-task, and Bug are actionable. Route larger types to decompose and thin specs to groom. Stop on open blockers; ask whether a disputed edge is stale instead of ignoring it.

Delegate the full issue and inherited context to `issue-auditor`. Show material stale, wrong, or unverifiable claims. Explore the real affected code and neighboring implementations, starting at `docs/README.md` and `docs/architecture.md`; read frontend conventions for frontend changes. Plan against verified code. If acceptance criteria cannot be fulfilled as written, return to the human for grooming.

Check `git status --short` before branching. Record pre-existing changes and leave unrelated files untouched; they may coexist when the layer can be isolated safely. If they overlap the layer, use a separate worktree or ask how to resolve the overlap. Do not stash, discard, stage, or include someone else's work. Start the first layer from up-to-date main. Use `<issue#>-<slug>` with descriptive suffixes for multiple layers. Record each layer's base branch and base commit before any edits, including wording. Later layers branch from the preceding submitted layer, not main. Use `gh stack init --base main <first-layer-branch>` to create or adopt the first branch once; use `gh stack add <next-layer-branch>` from the preceding layer to create each later branch once, without auto-staging or committing flags. Confirm membership before edits. Follow the installed help if behavior differs; see `.claude/lib/stack-shipping.md`.

## 2. Figma approval before implementation planning

If the issue changes UI appearance or interaction, obtain explicit approval of Figma mockups before drafting the implementation plan. Cover changed screens, components, states, navigation, and copy-driven layout changes. A frontend internal refactor with no UI change skips this gate; state why.

In Codex, delegate to `figma-designer` with the full issue and inherited scope, audit findings, existing UI/design references, target Figma file or creation authorization, changed states, interactions, and viewport constraints. Await exact frame links, revision/snapshot, state coverage, and open questions; the caller presents these and obtains approval. In Claude Code, prepare the mockups in the main workflow. Use the available Figma skills and tools, loading their required prerequisites before tool calls. Inspect or prepare mockups covering changed states, relevant viewport sizes, and interactions. New copy uses semantic placeholders and remains provisional until wording. Present links to the exact frames and wait for approval. Existing mockups count only when the user confirms that the linked revision covers this issue. If Figma access or a destination is missing, request it and stop at this gate; do not substitute a prose sketch.

Design exploration is allowed here; file-by-file implementation planning is not. Record approved frame links, revision or snapshot, behavior, and approval in the issue through an authorized write. Design scope changes return here before replanning. Wording that changes the approved layout or interaction also requires renewed mockup approval.

## 3. Plan approval

Present one concrete implementation plan against the approved requirements and mockups. Name files, design decisions, meaningful tests, and relevant conventions. Split the issue into smaller, independently reviewable and verifiable layers where practical; explain when one layer is sufficient. Prefer vertical slices. For each layer name scope, criteria subset, dependencies, branch/base, validation, and intended PR outcome. Map every issue criterion to a layer.

Do not propose UI wording. Describe only semantics, owning component, resource key, parameters, placement, and layout constraints needed to brief wording. Reference approved Figma frames rather than inventing dimensions.

Show the plan and stop. No implementation or localization resource writes until explicit approval. Clarify whether approval includes committing and publishing reviewed layers with `gh stack submit` and updating their PR metadata. Honor existing authorization without asking again. If publication is not authorized, finish a concrete reviewed layer before requesting publication approval. Elapsed time is never approval.

Keep the approved plan, layer order, base commits, design references, selected copy, and progress in the issue body through authorized writes, preserving unrelated content. This is the resume record. Set Status to In progress and the current Iteration via `.claude/lib/project-status.md` when approved work starts.

## 4. Wording before each layer's implementation

For every new or changed user-visible string in the layer, run the current client's wording procedure. Delegate proposals to `wordsmith`, present them verbatim, and wait for the user's selection. The caller writes the selected English values and matching translator notes into the owning component's `i18n/en.json` and `en.context.json`, preparing scope scaffolding as needed. Skip only when no user-visible copy changes.

Pass `implementer` the complete approved plan and current layer, full issue and inherited criteria, branch and base commit, approved mockups, and a resource manifest: paths, keys, exact selected values, interpolation parameters, context notes, and layout assumptions. Resources must already exist; prose suggestions are not a resource handoff.

## 5. Implement and verify

Delegate to `implementer`; do not silently replace it with caller implementation. It binds existing keys but never authors, edits, shortens, or translates user-visible text or resource values. Missing copy or text that does not fit returns to wording with measurements. A design or plan change returns to its approval gate.

Await the report and run the current client's verify procedure for this layer. Send code fixes to the implementer and copy fixes through wording; docs belong to the docs phase. Do not proceed on failing checks.

## 6. Independent review, at most two fix passes

Spawn a fresh read-only `reviewer` without the implementer conversation history with the issue, complete approved plan, layer scope and criteria, approved mockups, resource manifest, real verification results, and complete current-layer changes. Mark deferred criteria as belonging to specific later layers; on the final layer assess every criterion against the cumulative tree, including predecessor-layer code.

Collect against the recorded layer base, not `main...HEAD` alone:

```text
git diff <layer-base-commit>
git ls-files --others --exclude-standard
git status --short
```

This diff includes tracked staged and unstaged changes plus commits since the base. Separately read and supply all relevant untracked files; a tracked diff omits them. Include copy resources. Resolve an unexpectedly empty change set before reviewing. Using the current layer base excludes predecessor layers.

Require separate findings on requirements, plan and mockup adherence, code quality and conventions, and security. Show the full report. For actionable defects, send a fix pass to the implementer (wording owns copy), rerun affected verification, and spawn a fresh review of the complete updated layer. Allow at most two fix passes after the initial review per layer. If the review after the second pass still finds defects, stop and call the human with unresolved findings and evidence. Do not submit or start the next layer. A wrong plan or scope dispute goes directly to the human.

Code quality includes the shared [style guide](../../docs/practice/code-style.md) and established neighboring idioms. Require the review to name the guides/examples read and cite changed lines for conventions findings. Unresolved style defects block a ready verdict even when all automated checks pass; honor explicit user-approved exceptions. Test review also checks placement and non-duplication against [test tiers](../../docs/practice/testing.md#test-tiers), rather than inferring quality from the suite's size.

## 7. Sync docs after clean review

Run the current client's sync-docs procedure against the current layer, including uncommitted work and reported drift. In Codex this delegates to `docs-sync` with the issue/approved plan, scope, base commit, full tracked and untracked changes, clean review report, verification results, and known drift. Await its changed-file/evidence report; it must not change application code or localization resources. Fix false claims and directly affected omissions without expanding unrelated docs. Report when no changes are needed. Check the docs diff against reviewed behavior. If this reveals a code defect, stop for the human rather than resetting an exhausted fix budget. Rerun applicable checks if final changes affect them.

## 8. Submit, then continue

Run the current client's ship procedure for this layer. In Codex delegate to `shipper` with the issue and approved plan, layer position, branch/base/predecessor, exact allowed paths, selected-copy manifest, final verification, clean review, docs-sync result, and the scope/evidence of authorization for each external action. Await its report and verify success before continuing; hook or code failures return to the owning phase, not an implementation attempt by the shipper. The ship procedure must: commit only reviewed code, approved copy, and synced docs with hooks; run `gh stack submit --auto --open` and verify every submitted PR is Ready (`isDraft=false`); update the resulting PR title and body for this layer. Do not close the issue from an intermediate PR. Verify the actual PR URL, base, and head, and record progress in the issue. A commit, submission, or metadata failure stops the cycle before the next layer; report exact local and remote state. Never merge automatically.

Only after successful submission and metadata updates, branch the next approved layer from the preceding one and repeat steps 4-8. Reuse approved design and overall plan unless scope changes. Assess any stack-tool changes to earlier PRs against existing authorization before publishing them. After the final layer, report all PR URLs, criteria coverage, verification, review outcomes, and remaining human actions.
