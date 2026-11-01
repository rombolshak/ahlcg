# Game State Stores

## Routed game session

`frontend/src/app/features/games/with-game-session.ts` owns the active `/game/:id` fixture page's state through `FixtureGameStore`. It is separate from the Arkham board store below.

- `GameConnectionService` owns transport, state resets and version ordering. The feature subscribes to `memberStateEvents` before connecting and validates every full view and applied patch through the supplied schema.
- `_confirmedView` and `_confirmedVersion` track server truth. `viewModel` is the displayed view, possibly with one optimistic action patch applied. `status` starts as `loading`; a null reset makes it `empty`, and a non-null reset makes it `ready`.
- `choose` accepts only an offered action and permits one pending action. It applies the offered patch optimistically and invokes `Execute`; while pending, `availableActions` is empty, although `holdsActions` still describes the confirmed offers.
- A successful execute response records the committed version. Reconciliation drops the pending action once the confirmed version reaches it. Until then, incoming confirmed changes reapply the pending action's latest offered patch. Missing offers or invalid optimistic patches drop it and restore confirmed truth. A null execute response or error also drops it; errors are rethrown.
- A null reset clears confirmed state, offers and pending work. `disconnect` unsubscribes from state events, disconnects the transport and drops pending work; it does not clear the retained confirmed view or reset the status to `loading`.

Tracked in [#749](https://github.com/rombolshak/ahlcg/issues/749). Connection replacement currently guards stale state messages, but not every lifecycle callback or delayed `start()` completion. The page connects in `ngOnInit`, so a reused component does not react to a changed route id. Do not assume those lifecycle cases are handled.

## Unrouted Arkham board

`frontend/src/app/pages/game-view/store/game-state.store.ts` — the single source of truth for the board. Read the file; this page explains the parts that are not obvious from it.

## Shape

`GameStateStore` is a `signalStore({ providedIn: 'root' })` over a wrapper:

```typescript
interface State {
  isLoading: boolean;
  error: string | null;
  gameState: GameState | null;
}
```

`GameState` (`@domain/game-state`) is **normalized**: `gameEntities` is a flat `Record<EntityId, GameEntity>`, and every other field (`acts`, `agendas`, `investigators`, `currentInvestigator`, `scenarioMap.places[].location`, an investigator's `hand` / `controlledAssets` / `threatArea`) holds ids. Nothing is nested by value, so a patch to one entity never has to be mirrored elsewhere.

Store features in order: `withState` → `withProps` (entity accessors) → `withComputed` → `withMethods`.

## Reading entities

`withProps` exposes `getEntity(id, guard)` plus typed wrappers `getAct`, `getAgenda`, `getLocation`, `getInvestigator`, `getAsset`, `getSkill`, `getEvent`, `getPlayerCard`, `getEnemy`. Each throws if the id is missing or the entity is the wrong `cardType`. Use them instead of indexing `gameEntities` — the type guards from `@domain/game-entity` are what make the union narrow.

These are plain functions, not signals: call them inside a `computed()` so the read is tracked.

```typescript
protected readonly cards = computed(() =>
  this.gameState.currentInvestigator()?.hand.map(card => this.gameState.getPlayerCard(card)) ?? []
);
```

## Writing

**`setState(state: GameState)`** — installs a whole state without runtime validation and clears `isLoading`. Used on load and by the debug panel's reset. Only the patch path below invokes the schema validator.

**`updateState(changes: Operation[])`** — applies RFC6902 patches. The sequence matters:

1. `Flip.getState('ah-investigator-avatar')` captures DOM geometry **before** the state changes.
2. `applyStatePatches` delegates to `applyJsonPatch` (`core/apply-json-patch.ts`, shared with `withGameSession` in `features/games/with-game-session.ts`), which mutates through `immer.produce`, so unchanged subtrees keep referential identity and dependent `computed`s do not recompute.
3. `applyPatch` results are checked; any non-null result throws with the collected messages.
4. `validateState` runs the full arktype schema on the result and calls `ArkErrors.throw()` on failure — an invalid patch aborts the update rather than corrupting the store.
5. A `requestAnimationFrame` callback runs `Flip.from(...)` after Angular has rendered.

Special case: when the store is empty, a single `replace` at path `''` is treated as a whole-state install, because `applyPatch` cannot patch `null`.

## Validation

`gameState` is an arktype schema with a `.narrow()` that enforces referential integrity across the normalized structure — every id in `acts`, `agendas`, `investigators`, `currentInvestigator`, each investigator's `hand` / `controlledAssets` / `threatArea`, and each map place must exist in `gameEntities` **and** have the expected `cardType`. Connections must join declared places and must not be self-loops.

Rejections use `ctx.reject({ path, problem })` (or `expected`/`actual`), so validation errors point at the exact field. When adding a field that holds an id, add it to the corresponding `validate*` helper — the type system alone will not catch a dangling reference.

## Animations

GSAP with the Flip plugin, registered once at module load in the store file. `package.json` requests GSAP `^3.15.0`. A stale `@ts-ignore` mentioning 3.14.2 currently sits above the `Act` import, not the Flip import; it is not evidence that Flip still needs a suppression.

Only `ah-investigator-avatar` elements are currently animated, for 2s with `power2.inOut`. To animate more, widen the `targets` selector in `updateState`. To debug a state transition without motion, comment out the `Flip.from` call.

## Debug workflow

The unrouted Arkham board uses a local fixture. `DebugTimelineService` provides its replay loop:

- It captures the first non-null state as `originalState` via an `effect`.
- `recordChanges(newModel)` diffs against the last recorded state with `createPatch` and appends a non-empty patch to `patches`.
- `applyNextPatch()` (`F9`) feeds the next recorded patch through `store.updateState`, exercising the real patch path.
- `restoreOriginalState()` (`F8`) resets.

The debug panel (backquote) is lazy-loaded into a `ViewContainerRef` and edits state through `vanilla-jsoneditor`.
