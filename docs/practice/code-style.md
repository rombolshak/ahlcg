# Code style

Read this guide before changing code or reviewing a diff. It applies to application code and tests. The [frontend conventions](../frontend/frontend-conventions.md), [backend guide](../backend/backend.md), [code layout](code-layout.md), [comments guide](comments.md) and [test tiers](testing.md) supply the language and capability-specific rules; this guide does not replace them.

## Follow the local idiom

Read two nearby implementations of the same kind and their tests before writing. Match their naming, structure, helper boundaries and test shape. Prefer the established approach over a new abstraction when it expresses the same behavior.

An explicit style rule applies to changed code even when a neighboring file violates it. An existing violation is not an exception. Where no rule is written, use a consistent local pattern supported by comparable examples. If the examples disagree, report the ambiguity rather than inventing a mandatory preference. User-approved exceptions apply only to their stated scope.

The statement that code wins over docs concerns descriptions of current behavior. It does not waive prescriptive conventions. Report inaccurate behavior documentation for docs sync; do not silently change a convention to fit an implementation.

## C# declarations and naming

- Explicit private fields use `_camelCase`. Constructor parameters, including primary-constructor parameters, are parameters and do not acquire a field prefix.
- Avoid unnecessary `this.` qualification. Use distinct field and parameter names instead of introducing shadowing.
- Public API methods precede protected methods; private helpers follow them. Keep generated `[LoggerMessage]` declarations at the bottom, as specified in the [logging guide](../backend/backend.md#logging). Follow the existing ordering of other member categories.
- For new or changed code, asynchronous methods whose signatures are under project control omit the `Async` suffix. Preserve names required by framework overrides or external interfaces; this rule does not require a repository-wide rename.
- Methods start with a verb; predicates use `Is`, `Has`, `Holds` or another clear predicate form. Variables identify what they contain: a stored state, destination version or required voters, rather than an unexplained `current`, `selected` or `required`.
- When a passed variable's name differs from its parameter name, name the argument explicitly where that distinction matters: `restoredVersion: targetVersion`. Boolean and null arguments must also make their role clear.
- When the signature is under our control, `CancellationToken ct = default` is the last parameter. Preserve signatures required by framework overrides or delegates. An endpoint's logger is its last service parameter, before the cancellation token when one is present.

## Expressions and boundaries

- Use the predicate overload of `FirstOrDefault` and similar terminal operations when it expresses the same query directly. Preserve meaningful ordering and projection.
- Sort only when the contract or algorithm requires an order. Explain the requirement through the code's structure and tests, rather than sorting sets by habit.
- Reuse already-loaded data when it contains the needed information. A query is still required when the earlier projection or range omitted that information; handle that boundary explicitly.
- Keep validation, state transition, persistence and publication responsibilities understandable. Extract helpers around those responsibilities, rather than hiding nesting solely to lower a complexity score.
- Treat analyser findings as findings even when the overall check passes. Verify each one, fix it or explain with evidence why it does not apply. Do not add blanket suppressions or bypass hooks.

## Tests

Use the lowest capable [test tier](testing.md#test-tiers), and avoid repeating an assertion at a higher tier unless it proves something newly observable there. Backend test methods retain the `Method_Scenario_Expected` naming convention. Follow the Given/When/Then structure described in that guide. Assert behavior; routine log wording and log levels are not behavioral substitutes. The narrow logging exceptions are documented in the [backend guide](../backend/backend.md#logging).

## Implementation and review evidence

The implementer names the relevant guides and comparable files used, then checks the changed declarations and blocks against them before handoff. Passing compilation and formatting is necessary but does not establish all naming, ordering or local-style rules.

The reviewer independently reads the guides and comparable code. A conventions finding cites the changed `file:line` and the applicable rule; an unwritten local idiom also cites comparable code. Record incomplete checks explicitly. Do not demand unrelated cleanup of untouched legacy code.

Conventions violations are actionable quality defects, including when behavior and tests pass. A ready verdict requires them to be fixed or covered by an explicit user-approved exception. They are not silently downgraded to optional preferences.
