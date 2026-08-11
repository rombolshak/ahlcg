# Glossary

Arkham Horror LCG terms that appear as types, fields, or asset paths in this codebase. General technical terms are omitted.

## Cards and entities

Every card in play is a **game entity** (`shared/domain/game-entity.ts`), a discriminated union on `cardType`: `act`, `agenda`, `enemy`, `location`, `investigator`, `asset`, `event`, `skill`. All entities live in one flat `gameEntities` map keyed by id; everything else in the state holds ids, never objects.

**Investigator** — the character a player controls. Has `skills`, `health` and `sanity`, `slotsCount`, `actions`, a `hand`, `controlledAssets`, and a `threatArea`.

**Skills** — `willpower`, `intellect`, `combat`, `agility`, and `wild`. Investigators have the first four (`wild` is omitted); player cards may declare any subset as skill icons.

**Vitals** — health and sanity, each modelled as `{ max, damaged }` rather than a current value.

**Player card** — `asset`, `event`, or `skill`. Cards a player holds or plays, as opposed to scenario cards.

**Asset** — a persistent card an investigator controls (ally, weapon, item…). Occupies an **asset slot**: `accessory`, `body`, `ally`, `hand`, `arcane`, or `tarot`, plus the double slots `two-hands` and `two-arcane`. An investigator's `slotsCount` records how many of each they have.

**Act** — scenario card tracking investigator progress. Advancing it moves the scenario toward success.

**Agenda** — scenario card tracking the opposing threat. Advancing it moves the scenario toward failure. Acts and agendas are ordered lists; the first is current.

**Enemy** — a hostile card. When engaged with an investigator it sits in that investigator's **threat area**.

**Location** — a place on the board. Locations form the **scenario map** (`scenarioMap`): `places` (a location plus the investigators standing there) joined by `connections`.

**Clue / resource / doom** — the three token types (`CardTokens`, all optional counts on any card). Clues advance acts, doom advances agendas, resources pay costs.

**Trauma** — permanent damage carried between scenarios.

**Faction** — a card's class colour (guardian, seeker, rogue, mystic, survivor, neutral). Drives card art templates and outline colours.

**Trait** — an italic keyword on a card (Item, Tome, Ally…). Translated separately under `assets/i18n/traits/`.

**Scenario** — one self-contained session. **Campaign** — a series of scenarios (`assets/i18n/campaigns/notz` is Night of the Zealot).

## Card identity

**Set info** (`SetInfo`) — a card's real-world identity as `{ set, index }`, e.g. set `01` index `002`. It addresses three things:

- description JSON: `public/assets/cards/{set}/{index}.json`
- translated strings: transloco scope `cards/{set}/{index}/{lang}`
- artwork: `public/assets/images/illustration/{set}/{index}.webp`

## Project-specific

**Ahlcg** — this project. Fan-made digital Arkham Horror: The Card Game.

**Anonymous user** — an account created with no email or password so a visitor can play immediately. Deleted on logout unless upgraded via `/auth/signIn`, which turns it into a permanent account in place.

**Migrator** — `backend/Ahlcg.Migrator`, a one-shot background service that applies EF Core migrations and then stops the host. Aspire waits for its completion before starting the API.
