# Translating

How a language gets from empty to shipped. This file is the brief for a **human translator**; it is also what a translation platform would be handed as project instructions if one is ever set up.

**If you are an agent working in this repo, this file is not a licence to translate.** English is still the only language written here — see the rule in [voice-and-tone.md](voice-and-tone.md#mechanics-that-constrain-the-words). Hand-translating a locale file means producing copy in a language nobody in review can read, which is how a deliberate voice turns into machine output. The process below assumes a person who speaks the target language and plays the game.

## What you are translating, and what you are not

Only `frontend/public/assets/i18n/<lang>.json` — the app's own chrome. `en.json` is the source; every other file mirrors its key structure.

**Card, trait, campaign and scenario text is not yours to translate.** Those live in the `cards/`, `traits/` and `campaigns/` subtrees and carry text Fantasy Flight has already published in your language. Inventing a second translation of a card would contradict the printed card in the player's hand. If a subtree is empty for your language, it stays empty until someone imports the official text.

## The two registers

This is the whole job, and it is the thing a machine gets wrong. Every string in `en.json` is in one of two registers, decided by what the string *does*, and they want opposite treatment.

**Operative** — buttons, menu entries, field labels, tooltips, status lines. Plain, short, imperative. Translate these the boring way: the shortest ordinary phrasing a native speaker would expect on a button. No atmosphere, no invention. A control that reads as clever has to be read twice.

**Atmospheric** — screen and dialog titles, empty states, error messages, flavour. `The archive would not open.` `The silence is deafening. It is not a comfort, but a prelude.` These must be **rewritten in your language, not carried across word by word.** The English is one solution to "convey dread without shouting"; your language needs its own. A literal rendering of an atmospheric line is the most common way this goes wrong — it reads as translated, which breaks the fiction more thoroughly than a plain sentence would.

The pairing is deliberate: dread in the heading, plain fact in the body. Keep it. If your language's heading comes out flat, the fix is a better heading, not atmosphere leaking into the message.

[voice-and-tone.md](voice-and-tone.md) has the frame these strings come from — an archive, and a visitor admitted to read it — plus the vocabulary rules. Read it before starting; the lexicon table there tells you which English words are load-bearing.

## Rules terms are fixed

Game vocabulary belongs to Fantasy Flight and is not yours to improve: *chaos bag*, *upkeep phase*, *evade*, *clue*, *resource*, *mythos*, *act*, *agenda*. [glossary.md](glossary.md) has the English set.

**Use the term the official edition in your language uses**, taken from the printed cards or a localised card database — not a translation you prefer. A player scanning for a rules word needs the exact word their cards use. The two Spanish entries already in the repo are the pattern: `act` → `Acto`, `agenda` → `Plan`.

Where your language has no official edition, pick one rendering, use it everywhere, and say so in the pull request so the next person does not choose differently.

## Traps in the file format

- **`{{param}}` must survive verbatim.** `{{date}}`, `{{originator}}` and friends are substituted at runtime. Where the token sits in the sentence is free — word order is not universal, and that is the point of the token — but the spelling inside the braces cannot change.
- **`#x#` and `@x@` are markup, not punctuation.** `#n#` becomes a glyph in the Arkham symbol font and `@Evade@` becomes bold italic, but **only where the template pipes the string through `withAhSymbols`**. Do not add one that the English string does not have; it will render as literal hashes.
- **`\n` is a real line break**, used where a message is deliberately two lines. Keep the break if the shape still makes sense in your language; drop it if it does not.
- **A run of numbered sibling keys is a randomised pool.** Entries appear one at a time with nothing around them, so each has to stand alone and match the others' rhythm and length. Translate the pool as a set, not key by key.
- **One string is one sentence.** Never split a sentence across keys or assemble one from several — the English does not, because word order differs.

## Length

German and Russian run roughly 30% longer than English, and the layout is sized for English. Buttons and menu entries are the tight ones: three words in English, and the row will not grow for you. If the honest translation does not fit, say so in the pull request rather than truncating — a label that lies is worse than a layout that needs widening, and the English may need to change too.

Titles are one line and do not wrap gracefully. Body text is one or two sentences, read at a glance mid-game.

## Plurals

There is **no ICU/messageformat support yet**, deliberately: no string currently needs a plural form. If you hit one that does in your language — Russian has three forms, Polish four — do not fake it with a phrasing that works for one count only. Say so, and the English string gets restructured.

## Previewing your work

The settings picker only lists languages that are **at least 90% translated**, so a language you are part-way through will not appear there. Load it explicitly instead:

```
http://localhost:4200/?lang=de
```

That adds the language for the session regardless of coverage, and it shows up in the settings picker with its proper name while the parameter is in the URL. Once you have selected it that way, the choice persists in your browser and keeps working without the parameter — an explicit choice always outranks the threshold.

To see where every language stands:

```
cd frontend && npm run lint:i18n
```

which prints the per-language coverage table — `missing` keys absent from your file, `untranslated` ones present but blank or still English, and `orphans` your file has that `en.json` does not. It also runs in CI, where **orphans fail the build** (usually the sign that a key was renamed upstream), while missing and untranslated counts are reported and never fail.

## Submitting — through Crowdin, not a pull request

Translation happens on **Crowdin**, not in this repository. You do not need a GitHub account, a clone, or any of the tooling above unless you want to preview locally.

The flow in both directions is automatic:

1. `en.json` changes land on `main`.
2. Crowdin picks them up as new source strings.
3. You translate them on Crowdin, with the glossary and screenshots for context.
4. Crowdin opens a pull request against this repository with the updated locale files. CI checks it like any other PR.

So **never hand-edit a locale file other than `en.json` in a pull request** — Crowdin owns those files, and a manual edit will be overwritten on its next sync. `en.json` is the opposite: it is the source, it is only ever changed here, and it goes through [`/wording`](voice-and-tone.md#how-new-copy-gets-written) rather than Crowdin.

Untranslated strings fall back to English key by key, so partial work is a perfectly good contribution — there is no need to finish a language in one pass. When coverage crosses 90%, the language starts appearing in the picker for everyone.

### What counts as translated

Coverage is not merely "the key exists in the file". A string counts only when it is present, non-blank, **and different from the English**. Crowdin can export untranslated strings either as `""` or as a copy of the source text, and both would otherwise report a wholly English locale as 100% complete — putting a language in the picker that shows no translation at all.

One consequence worth knowing: if the correct translation genuinely *is* the English word, it is counted as untranslated. `game_header.current_game_phase.round` is the real case — "Round" is what the French and Italian editions print. A handful of these costs a fraction of a percent; if they ever hold a finished language below the threshold, say so and we will add a per-language allowlist rather than have you mistranslate a term to satisfy a counter.

### Glossary and screenshots

Two things exist to make the context above unnecessary to remember:

- The **glossary** carries every term in the two categories above — the fixed Fantasy Flight rules words and this app's own coinages — with a note on each saying which it is and what sense is meant. Its source of truth is `crowdin/glossary.csv` in this repository, imported into Crowdin; the English side is maintained here, and the per-language terms are yours to fill in on Crowdin.
- **Screenshots** are captured from Storybook, so every state has one, including the ones that are awkward to reach in a running app — the empty Case files screen, its error state, the signed-out account panel. They are regenerated with `npm run i18n:screenshots` and uploaded with `npm run i18n:screenshots:upload`, which auto-tags strings by matching the text Crowdin reads off the image. They are not committed; they are build output.

### Running the upload yourself

```bash
cd frontend
export CROWDIN_PROJECT_ID=932245          # the NUMERIC id, not the `ahlcg-online` slug
export CROWDIN_TOKEN_FILE=/path/to/token  # or CROWDIN_PERSONAL_TOKEN directly
npm run build-storybook && npm run i18n:screenshots && npm run i18n:screenshots:upload
```

Two traps worth knowing, both hit while wiring this up:

- **The project id is numeric.** `ahlcg-online` is the slug and the API rejects it.
- **Node must be told to trust the OS certificate store.** On Windows it otherwise ignores it entirely, and behind a TLS-intercepting proxy every call dies with `SELF_SIGNED_CERT_IN_CHAIN`. That is why the upload script runs under `--use-system-ca`. The Crowdin **CLI** cannot be fixed this way — it is a Java program with its own trust store — which is why the uploader talks to the REST API directly instead of shelling out to it.

Re-running the upload replaces each screenshot and re-tags it, so a re-captured screen never keeps tags pointing at text that has since moved.
