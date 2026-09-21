# Frontend

Angular 22 SPA in `frontend/`. Read [frontend-conventions.md](frontend-conventions.md) before writing any code here.

## Layout

```
frontend/
├── src/
│   ├── app/
│   │   ├── app.component.ts / app.config.ts / app.routes.ts
│   │   ├── transloco-loader.ts
│   │   ├── pages/
│   │   │   ├── main-menu/            title/, menu-items-list/
│   │   │   └── game-view/
│   │   │       ├── game-header/
│   │   │       ├── cards-hand/
│   │   │       ├── card-details-text/
│   │   │       ├── enemy-attack-display/
│   │   │       ├── enemy-skill-tests-display/
│   │   │       ├── current-investigator-panel/
│   │   │       │                     investigator/, actions-area/, control-area/, threat-area/
│   │   │       ├── global-game-info-panel/   act/, agenda/
│   │   │       ├── play-area/        location/, locations-connection/
│   │   │       ├── debug-panel/      (lazy-loaded)
│   │   │       ├── services/         debug-timeline.service.ts
│   │   │       └── store/            game-state.store.ts
│   │   ├── domain/                   arktype schemas + inferred types
│   │   │   ├── entities/             act, agenda, enemy, location, investigator,
│   │   │   │                         card, player-card, id models; details/
│   │   │   ├── card-art/             image-url.ts
│   │   │   ├── testing/              pure fixtures (entities/, test-game-state, …) — see below
│   │   │   ├── game-state.ts         root schema
│   │   │   ├── game-entity.ts        entity union + type guards
│   │   │   └── game-map.model.ts, meta-info.ts, action.model.ts,
│   │   │       card.constants.ts, display.options.ts
│   │   ├── core/                     auth/, card-info, dialog/, list-navigation,
│   │   │                             input-manager, settings/
│   │   ├── ui/                       kit/ takes primitives, game/ takes domain models
│   │   │   ├── kit/                  art-button/, art-panel/, numeric-text/, text-with-overlay/,
│   │   │   │                         svg/, json-editor/, single-bar/
│   │   │   ├── game/                 vitals-bar/, cards/ (asset-card/, event-card/,
│   │   │   │                         skill-card/, card-parts/), directives/cards/
│   │   │   ├── directives/           focus-trap
│   │   │   └── pipes/                as, trim-start, with-ah-symbols
│   │   └── features/
│   │       ├── auth/                 sign-in/, credentials-form/
│   │       ├── card/                 resolves CardInfo, switches on card type
│   │       └── settings/             account/, setting-item/, user-preferences.service.ts
│   ├── testing/                      transloco.testing.ts, serve-card-assets.ts (see below)
│   ├── styles.css                    Tailwind + daisyUI theme (design tokens)
│   ├── test-setup.ts                 localStorage polyfill for happy-dom
│   └── main.ts / index.html
├── public/assets/                    cards/, images/, fonts/, i18n/
├── .storybook/
├── angular.json, proxy.conf.js, transloco.config.ts, eslint.config.js,
└── sonar-project.properties
```

Fixtures split by whether they touch a framework. The ten pure fixtures (`entities/`, `test-actions.ts`, `test-game-map.ts`, `test-game-state.ts`, `test-meta.ts`) import only `@domain/*` and live under `app/domain/testing/`, reached through the `@domain/*` alias like the rest of the layer. `transloco.testing.ts` (imports `@jsverse/transloco`) and `serve-card-assets.ts` (imports `@angular/common/http`) would violate `domain/`'s framework-free rule, so they stay at `src/testing/` behind `@testing/*`. `src/testing/` itself lives in `src/` (not a test-only folder) because Storybook imports `transloco.testing`, and `GameViewComponent` imports `test-game-state` at runtime — a fixture in production code, deliberately visible as a `game-view-fixture-import` warning until #497 Live game state replaces it.

## Routing

`app.routes.ts` — three lazy routes, no guards or resolvers:

- `''` → `MainMenuComponent` (`pathMatch: 'full'`)
- `'case-files'` → `CaseFilesComponent`
- `'game/:id'` → `GameViewComponent` (`pathMatch: 'prefix'`)

There is no wildcard route. `:id` reaches `GameViewComponent` as an `input.required<string>()` — that works because `provideRouter` is configured `withComponentInputBinding()`, without which the input would never be set and the component would throw. The id decides which game the SignalR connection binds to; the board itself still loads a fixture.

`case-files` has no auth guard: the menu item that reaches it is disabled when signed out, and the
screen's `rxResource` is keyed on the current user, so a signed-out visitor issues no request at all
and lands on the empty state rather than an error.

## Application config

`app.config.ts` providers: `provideZonelessChangeDetection()`, `provideRouter(routes, withComponentInputBinding())`, `provideHttpClient(withInterceptors([authInterceptor]))`, a Bugsnag `ErrorHandler`, and `provideTransloco()`.

Bugsnag is started at module scope with a hardcoded browser API key — that is intentional and safe (browser keys are public).

## Services

| Service | Responsibility |
| --- | --- |
| `AuthService` | `GET /api/auth/info` on construction; exposes `currentUser: Observable<User \| undefined>`. `401` maps to `undefined`. `loginAnonymously()`, `signIn(credentials)` and `logout()` each post, then `switchMap` into `refreshCurrentUser()`, so `currentUser` carries server truth rather than an optimistic guess. `signIn` covers signing in, registering and upgrading an anonymous account — the server picks the branch, so there is no separate "link" call. All return cold observables — nothing is requested until subscription. |
| `DialogService` | Opens a dialog imperatively: `open(Component, { titleKey })` creates a `DialogComponent` into a detached host on `document.body`, mounts the component inside it, and returns an `Observable` of the value that component emits on its `result` output. **One dialog per component type** — a second `open()` for a type already showing returns the existing stream, which is what makes concurrent `401`s share one prompt. Teardown (detach, destroy, remove the host, clear the entry) runs on `result` *or* on the dialog closing by any other route, so no dismissal can strand the service. The content component provides `AH_DIALOG_CONTENT` and exposes `result`; `<ah-dialog>` still accepts projected content declaratively, as `SettingsComponent` uses it. |
| `CardInfoService` | Loads and caches a card's description JSON, translated strings, and traits for a `SetInfo`. Returns a `Signal<CardInfo \| undefined>` from a `Signal<GameCard \| undefined>`. Validates with arktype; on failure caches an `isLoadedWithError` placeholder rather than throwing. Called from `features/card/` and from the `pages/game-view/` components that lay out their own card details — never from `ui/`, whose card components take a resolved `CardInfo` as an input. |
| `InputManagerService` | Keyboard command layers. Maps `event.code` → semantic `InputCommand` (`confirm`, `cancel`, `moveUp`…, `toggleDebugPanel`, `resetState`, `applyPatch`), dispatches to the topmost registered layer. `registerGlobal(layer)` sets the fallback layer; `pushLayer(layer)` returns a `LayerRef` with a `destroy()` to pop it. A layer may be a plain object or an `InputLayerProvider` (`() => InputLayer`), resolved on every keystroke — that is how a pushed layer can keep up with state that changes underneath it, including which commands it handles at all, and therefore which ones fall through to the global layer. `Tab` is deliberately swallowed to disable browser tab navigation. Keys originating in a text-entry element (`<textarea>`, `contenteditable`, or an `<input>` of a text-ish type) are exempt from all of this except `Escape` and `Enter` — otherwise typing would fire `confirm` on Space and navigation on WASD, and `Tab` between form fields would be dead. |
| `SettingsService<T>` | Generic localStorage-backed settings. Configured per consumer with the `DEFAULT_SETTINGS` and `STORAGE_KEY_SUFFIX` tokens; persists only the diff against defaults under `ahlcg_{suffix}`. `provideUserPreferencesService()` in `features/settings/` is the concrete configuration. |
| `GameConnectionService` | The SignalR connection for one game, opened by `GameViewComponent` from the route's `:id` and closed on leave. Connects to **`/api/game?gameId=…`**, not `/game` — the hub path collides with the SPA's own `/game/:id` route, so it goes through the dev proxy's `^/api` rewrite. Exposes a `Signal` of `connecting` / `connected` / `disconnected`, the last carrying `initial`, `server_rejected` or `network_error`. A drop is retried by SignalR's automatic reconnect, which gives up after its default backoff (0s, 2s, 10s, 30s) and reports `network_error`. The one thing that stops it retrying *early* is an `Exit` message from the server, which the service answers by stopping the connection itself — a close on its own is indistinguishable from a drop, which is why the server asks rather than hangs up. `connect()` is idempotent per game id — calling it again for the game already connected is a no-op, and a different id replaces the connection. Message names are PascalCase (`'Ping'`, `'Exit'`) because SignalR takes them verbatim from the server — a lowercase handler silently never fires. The `HubConnection` is built by the `GAME_HUB_CONNECTION_FACTORY` token so specs can substitute a fake. Carries no game state yet — that is #251. |
| `DebugTimelineService` | Records `createPatch` diffs of store state and replays them (`F9`), or restores the original (`F8`). Game-view scoped. |

`imageUrl(descriptor)` is a pure function in `domain/card-art/`, not a service — it maps a typed `ImageDescriptor` tuple (or a bare string) to `/assets/images/{...}.webp`. Add new image categories to the `ImageDescriptor` union, not as raw strings.

`core/list-navigation.ts` sits next to `InputManagerService` but is **not** a service — it is a plain signal factory (`listNavigation({ items, onConfirm?, orientation? })`) called in a field initializer. Given a `Signal` of items it owns the selected index, wrapping in both directions and skipping any item carrying `disabled: true`; there is no predicate to configure, and items without that property are always selectable. It binds one axis — `moveUp`/`moveDown` or `moveLeft`/`moveRight` — leaving the other free, which is why `SettingsComponent` can still spend `moveLeft`/`moveRight` on changing a setting's value.

It returns an `InputLayer` fragment rather than registering one, so **layer lifetime stays with the caller**. That is what lets one helper serve both ownership models: `MenuItemsListComponent` pushes the fragment through `InputManagerService` itself, while `SettingsComponent` spreads it into the handlers `DialogComponent` merges into the layer *it* owns. `DialogComponent` registers that layer as a provider, so content is free to return different handlers as its own state changes — `SignInComponent` swaps a whole view, and `Escape` means something different in each. The helper never touches the DOM or moves focus — a component that needs to show which entry is selected binds a class, as both call sites do.

## Internationalization

Transloco. `TranslocoHttpLoader` fetches `/assets/i18n/{lang}.json`.

- **`availableLangs` is derived, never hand-written.** `app.config.ts` computes it from `src/app/generated/available-langs.ts` — a gitignored module carrying each language's translation coverage — keeping those at or above a **90%** threshold. A language is enabled by being translated, not by editing a list. `defaultLang`/`fallbackLang` are `en` with `useFallbackTranslation`, so a missing key renders English silently.
- **An explicit choice outranks the threshold.** `?lang=xx`, or an `xx` already persisted in the user's preferences, adds that language to `availableLangs` even at 0% coverage — that is how a translator previews unfinished work, and how someone who chose a language before it fell below the bar keeps it. Both paths go through the same pure `resolveAvailableLangs()` in `core/i18n/`; the threshold governs what the app *advertises*, never what it can load. An id the generated module does not know is ignored.
- `transloco.config.ts` (`rootTranslationsPath: public/assets/i18n/`) is **not** read by anything — the app config is inline in `app.config.ts`, and the tooling that consumed this file (the Transloco schematics, `transloco-keys-manager`) is no longer installed. `i18n-languages.json` is the authoritative language list.
- **Scopes** are lazily loaded subtrees under `public/assets/i18n/`:
  - `cards/{set}/{index}/{lang}.json` — one file per card, loaded by `CardInfoService`
  - `traits/{lang}.json` — shared trait names
  - `campaigns/notz/…` — campaign/scenario text
- `scopes: { keepCasing: true }` — scope keys are case-sensitive, so paths like `cards/01/002` must match the folder exactly.

Use the `TranslocoDirective` (`*transloco`) in templates; `TranslocoService.load()` for scopes resolved at runtime.

**The English values are not yours to invent.** What a string *says* is decided by [voice-and-tone.md](voice-and-tone.md) and chosen by the user from variants the `wordsmith` agent proposes — run `/wording`. Adding a key to `en.json` with a wording nobody chose is a convention violation, not a detail. Only `en.json` is ever hand-edited; the other languages lag and fall back key by key.

## Styling

Tailwind CSS 4 via `@tailwindcss/postcss`, plus daisyUI 5. `src/styles.css` imports Tailwind, `@toolwind/anchors`, and the jsoneditor dark theme, then declares the custom daisyUI theme `abyss` (dark, `default: true`) with all colour, radius, and size tokens. Change design tokens there; consume them as daisyUI/Tailwind classes or `var(--color-…)`.

## Storybook

Storybook 10 with `@storybook/angular`, `experimentalZoneless: true`, config in `.storybook/`. `preview.ts` provides `getTranslocoModule()` (from `@testing/transloco.testing`) and `provideHttpClient()` globally, so stories render translated text without extra setup. Stories sit next to their component as `{name}.stories.ts` and are excluded from Sonar coverage. Chromatic runs them for visual regression in CI.
