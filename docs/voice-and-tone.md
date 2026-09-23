# Voice and Tone

How the app talks. Every user-visible string is written against this file, and it is the brief the `wordsmith` agent reads before proposing anything.

## What this app is

A companion for *Arkham Horror: The Card Game* — a co-operative Lovecraftian investigation game. The reader of these strings is sitting at a table mid-game with cards in front of them, or picking up an investigation they abandoned three weeks ago. They are not reading the app; they are glancing at it.

So the copy has two jobs that pull against each other: **be instantly scannable**, and **feel like part of the game rather than a spreadsheet with a dark theme**. The way out of that tension is not to compromise on both — it is to split the strings.

## The frame

The app is an archive of case files, and the reader is a **visitor** to it — someone admitted to a restricted collection, never its owner. They are given leave to read, and what they read is the account of an investigation someone else lived.

That also settles a question the game's own rules leave open. The rules say a player controls an investigator and never say by what means. Here the player is the reader, the investigator is the person in the file, and the reading is the control.

Two things follow for the copy. There is a **desk**, and it can refuse — so a failure, a limit, or anything gated has a voice of its own rather than the software's. And a visitor is a guest: they own the reading, not the collection, which is why an account is admission rather than property.

## The two registers

Every string is in one of two registers, decided by the string's **job**, never by the screen it sits on.

**Operative** — anything the user acts on or scans: buttons, menu entries, field labels, tooltips, status lines. Plain, short, present tense, imperative when it is an action. `Try again`. `Sign out`. `Email`. `Last played {{date}}`. There is no atmosphere here at all, because a control that is being clever is a control that has to be read twice.

**Atmospheric** — anything the user *reads*: screen and dialog titles, empty states, error messages, explanatory leads, flavour. This is where the world speaks. `The archive would not open.` `Every investigation you begin is filed here.` `The silence is deafening. It is not a comfort, but a prelude.`

The pairing is the whole mechanism. `case_files.error` is the model to copy:

| Key | String | Register |
| --- | --- | --- |
| `title` | The archive would not open | atmospheric |
| `message` | Your case files could not be retrieved. | operative |
| `retry` | Try again | operative |

Dread in the heading; what happened and the way out in plain words. Invert it and you get either a flat app or a user who cannot tell what just broke.

**The one crossing:** a confirm button may take the dialog's register when the *consequence* is the point — `settings.account.sign_out_warning` answers `Delete and sign out` with `Keep the ticket` rather than a bare `Cancel`. `Keep the ticket` is in-world, names the thing being kept, and is still unmistakable. That is the test a flavoured control has to pass: unambiguous about what it does, with no second reading.

## The lexicon

The fiction already has a vocabulary. Reuse it. A second word for something already named makes the app read like two products stitched together.

| Concept | We say | Never |
| --- | --- | --- |
| A game / play session | investigation, case file | session, save, slot, match |
| Starting one | Begin an investigation, New investigation | Create game, New session |
| The saved-games screen | Case files | My games, Saved games, History |
| Decks | Dossiers | My decks, Collection |
| An account | admission to the archives | profile, user account, a pact, a binding |
| An anonymous account | a visitor's ticket — no credentials taken, no record kept, this device alone | guest account, temporary account, the Lucky Talisman |
| A registered account | an admission pass — credentials given once, good from any device | full account, the Tome of Binding |
| Registering | enrolling | Sign up, Create account, Bind account |
| Email, name and password | credentials | particulars, details, personal information |
| A backend failure | The archives are silent; the archive would not open | Server error, Something went wrong |
| Signing in | Sign in | Log in, Log on |

### Sorcery belongs to the Mythos

Atmospheric does not mean occult. The fiction carries two vocabularies and they are not interchangeable.

**The Mythos** — sigils, pacts, talismans, rites, wandering spirits. This is the vocabulary of what the case files *describe*: the cards, the scenarios, the things the investigators met.

**The archive** — files, tickets, passes, credentials, the desk, admission, the hand that filed this. This is the vocabulary of the app itself: accounts, lists, settings, errors, navigation.

The player is a visitor, not a scholar: they came to *play*, so the archive words describe the admission and the files, never the activity. **Nothing in the chrome calls the player a reader or calls playing "reading".**

The test is what the string is about, not how atmospheric it is: if it describes something **the software** does, it is archive vocabulary in either register. Sorcery reaching a control the user operates — an account, a sign-out, a password field — is the frame leaking, and it makes the fiction weaker rather than stronger. A desk that keeps no record of you is colder than any binding rite.

**Game rules terms are Fantasy Flight's and are fixed** — *chaos bag*, *upkeep phase*, *evade*, *clue*, *resource*, *mythos*. Never paraphrase or prettify one; a player scanning for a rules word needs that exact word. [glossary.md](glossary.md) has the set.

## Do

- Write to **you**, present tense.
- Put the plain meaning in the body, however in-world the title is.
- Make failure the world's fault, never the user's — the archives are silent, the desk declines.
- Keep dread **implied**. `The silence is deafening` earns more than any amount of shouting.
- Prefer a concrete noun over an abstraction: *the archive*, *the tome*, *the case file*.
- Match the shape of the string next to it — sibling list items, sibling dialog buttons and sibling flavour lines should scan as one set.
- Say what happens next when something went wrong and the user can act.

## Don't

- **No modern-SaaS chirp.** `Oops!`, `Something went wrong`, `Uh-oh`, `Whoops`, emoji, exclamation marks.
- **No apologising.** The app is not sorry. `Sorry, we couldn't load your games` is the failure mode this whole file exists to prevent.
- **No internals.** No status codes, no *the server*, no *the API*, no SignalR, no component or field names.
- **No purple prose past the moment's size.** A tooltip does not get two clauses of dread.
- **No cleverness in a control label.** See the one crossing above; that is the only licence.
- **No puns, rhymes or idioms.** Seven languages ship from this text; wordplay does not survive and there is no context for a translator to recover it from.
- **No sentences assembled from several keys.** One string per sentence, interpolation for the variable parts — word order is not universal.
- **No ALL CAPS and no manual punctuation for emphasis.** Styling does that.
- **No blame, no scolding, no instructions the user did not ask for.**

## Mechanics that constrain the words

- An **`en.json` in the `i18n/` folder beside the component that renders the string** is the source, one per component. **English is the only language you write** — the files beside it lag behind and fall back to English key by key. Never hand-translate. The other languages are written by human translators who speak them, briefed by [translating.md](translating.md).
- Keys are `snake_case`, nested only within the file. What used to be a feature-area prefix is now the folder the file sits in — see [frontend.md](frontend.md#internationalization).
- **British spelling** — *enrol*, *flavour*, *apologising*. It is what `docs/` already uses; the English strings had nothing either way until `account.anonymous.upgrade` forced the call.
- Interpolation is `{{param}}` — the token must survive rewording verbatim; where it sits in the sentence is free.
- `#x#` and `@x@` are markup for `WithAhSymbolsPipe` (`frontend/src/app/ui/pipes/with-ah-symbols.pipe.ts`): `#n#` becomes the glyph in the Arkham symbol font, `@Evade@` becomes bold italic. **They only render where the template pipes the string through `withAhSymbols`** — anywhere else they show as literal hashes, so do not introduce one without checking the template.
- `\n` in a value is a real line break, used where a message is deliberately two lines (`case_files.empty.message`).
- A run of numbered sibling keys — `game_view…threat_area.no_threats.1` through `.25` — is a **randomised flavour pool**. Entries are shown one at a time with nothing around them, so each has to stand alone, and a new entry has to match the pool's rhythm and length or it will read as an intruder.

## Length budgets

| Kind | Budget | Why |
| --- | --- | --- |
| Button, menu entry | ≤ 3 words | German and Russian run ~30% longer; the layout is sized for English |
| Title | ≤ 40 characters, one line | Dialog and screen headers do not wrap gracefully |
| Body, empty state, error message | 1–2 sentences | It is read at a glance, mid-game |
| Tooltip | one clause | |
| Flavour pool entry | whatever the pool already does | |

**The button budget yields to a destructive action.** `settings.account.sign_out_warning.confirm` is `Delete and sign out` — four words, deliberately. The budget exists for German and Russian expansion; naming both halves of what the button does is a guarantee, and a guarantee outranks a layout risk. It is the only string licensed to exceed its budget, and if the row cannot take it the fix is a shorter *true* label, never a truncation of this one.

## How new copy gets written

A user-visible string is not invented in passing while implementing something else. Run [`/wording`](../.claude/commands/wording.md): it builds the brief, the `wordsmith` agent proposes variants against this file, you choose, and the chosen strings go into `en.json`. `/work` stops at the same gate — a plan that adds strings routes through `/wording` before the implementer is handed anything.

This file is the standard, so it is also the thing to change when the standard is wrong. If a chosen wording contradicts a rule here and the wording is right, the rule was wrong — fix it here in the same change.
