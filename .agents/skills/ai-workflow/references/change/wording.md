
Get copy written for: **$ARGUMENTS**

The strings users read do not get invented in passing. This command is the gate: a brief, several real options, a human choice, then the file.

## 1. Build the brief

`wordsmith` is only as good as the brief, and the brief is the part you can actually do — it needs the situation, not the sentence. Four things go in it, per string: **where** it appears, **the scenario** that puts it there, **what it must make the user understand**, and **the hard constraints** (key path, interpolation params, the length the slot can take, whether the template pipes through `withAhSymbols`).

Where those facts come from depends on whether the screen exists yet, and both cases are normal.

**The UI is already built** — you are rewriting shipped copy, or adding a string to an existing screen. Read the code: the component and its template tell you the layout, the siblings, the params the call site passes, and whether the symbol pipe is in the chain. Use it; do not ask the user what a file already says.

**The UI does not exist yet** — the usual case when `$ai-workflow work` calls this, because the copy gate deliberately runs before implementation. There is no template to read, so take the layout facts from these, in this order:

1. **The approved Figma frames.** Read the real slot dimensions, states, neighbors, and relevant viewport layouts. UI work requires their approval before implementation planning; placeholder text is not selected copy.
2. **The approved implementation plan.** Read the component ownership, key semantics, call-site parameters, and binding requirements. The plan does not choose the words.
3. **The nearest comparable existing screen.** Use it for details the approved design leaves unspecified; label any inferred constraint as an assumption.

What is available either way, built or not: the neighbouring keys in the owning component's `en.json`, the semantic siblings in the other components' files, and the standard.

Ask the user only for what none of those can give you — normally just the scenario and the semantics, and only when they are genuinely missing. Ask in the conversation, using concrete choices when helpful. **Do not guess the scenario.** Copy written for a scenario you invented cannot be reviewed, because the user cannot see which half you made up.

**Whatever is still unknown after all that goes into the brief as a stated assumption** — *"assumed: single-line button in a row of three, ~16 characters"* — never as a fact. A guessed constraint presented as an observed one is how a 40-character title gets chosen for a 20-character slot and nobody finds out until the screen is built. Stated, the user corrects it in one word and `wordsmith` is writing to a real limit.

## 2. Dispatch

Delegate synchronously to the configured Codex `wordsmith` agent with the complete brief, and wait for its proposals.

Do not pre-write the copy yourself and ask it to improve yours. Yours becomes the anchor and every variant comes back orbiting it, which is exactly the failure the agent exists to avoid.

## 3. Present the choice

Show the variants **verbatim**, grouped by key, with the agent's one-line rationales intact. Do not re-rank them, do not summarise them, do not append your own favourite. You are running the gate, not competing in it.

- **≤ 4 variants for ≤ 4 strings:** ask in the conversation, one question per string, one option per variant.
- **Anything larger, or an approach-first cluster:** a numbered list in the message, and ask the user to answer with picks (`1a, 2c`) or a free-form direction.

The user may also mix — take a title from one set and a button from another, or ask for another pass with a steer.

## 4. Iterate in place

If the user rejects the set or steers it, go back to **the same agent** with Codex follow-up delegation (for example `followup_task` for an idle agent) — it still holds the brief, the standard, and the neighbours, and a fresh spawn would re-derive all of it and drift. Pass the steer as-is; do not soften it.

Two rounds is usually the limit. If the third pass is still wrong, the brief was wrong: say so, fix the brief with the user, and start clean.

## 5. Write the chosen strings

If the chosen wording changes approved layout or interaction, return to Figma approval before implementation. Otherwise use the approved slot; do not redesign it silently.

Only after an explicit choice, and only into an `en.json` under `frontend/src/app/`:

- **A string goes in the `i18n/` folder of the component that renders it.** That folder is the transloco scope, and the key is written without the scope prefix. A string for a component that has no `i18n/` folder yet gets a new one, holding `en.json`, `en.context.json` and the `scope.ts` that names the scope — see `docs/frontend/frontend.md#internationalization` for how a component names its scope.
- Place each key in the tree where the UI puts it, next to its neighbours — not appended at the end.
- Match the file: two-space indent, existing key style, `\n` and `{{param}}` tokens exactly as approved.
- **Write the translator's note too**, in the `en.context.json` beside the file you just edited, under the same key. One line saying where the string sits and what constrains it — the room it has, a `#n#` that must survive, a randomised pool it belongs to. That knowledge is in your head right now and nowhere else; `scripts/fill-context.mjs` reports every string that lacks one.
- **English only.** The other language files lag and fall back key by key; never hand-translate.
- If the key is already wired into a template, replacing the value is the whole change. If it is not — the usual case when the copy gate runs ahead of the code — say so: the key exists and the implementer will bind to it. Wiring is `$ai-workflow work`'s job, not this command's.

Confirm each file you touched still parses:

```powershell
Get-Content <path>/en.json -Raw | ConvertFrom-Json | Out-Null
```

## 6. Report

Give the user the key paths written and their final values, **every assumption the brief carried**, and anything still open — a template to wire, a neighbouring string that now reads inconsistently, a constraint the copy had to fight.

An assumed constraint is a debt this command leaves behind. If the screen is built later and the chosen string does not fit — it wraps, truncates, or collides — that is not the implementer's to quietly trim. It comes back here with the real measurement.

If a chosen wording contradicts a rule in `docs/practice/copy/voice-and-tone.md` and the wording is right, the rule is what is wrong: propose the edit to that file in the same breath. The standard is supposed to move.
