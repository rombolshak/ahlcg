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
│   │   │       ├── components/       game-header/, cards-hand/, card-details-text/,
│   │   │       │                     enemy-attack-display/, enemy-skill-tests-display/
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
│   │   │   ├── game-state.ts         root schema
│   │   │   ├── game-entity.ts        entity union + type guards
│   │   │   └── game-map.model.ts, meta-info.ts, action.model.ts,
│   │   │       card.constants.ts, display.options.ts
│   │   ├── core/                     auth, auth.interceptor, card-info, dialog,
│   │   │                             images-url, input-manager, settings/
│   │   ├── ui/
│   │   │   ├── components/           cards/, dialog/, sign-in/, settings/, art-button/, art-panel/,
│   │   │   │                         numeric-text/, vitals-bar/, svg/, json-editor/,
│   │   │   │                         text-with-overlay/
│   │   │   ├── directives/cards/     card-background, card-faction-background, card-outline
│   │   │   └── pipes/                as, trim-start, with-ah-symbols
│   │   └── features/                 empty, see #541
│   ├── testing/                      fixtures + test helpers (shipped in src, see below)
│   ├── styles.css                    Tailwind + daisyUI theme (design tokens)
│   ├── test-setup.ts                 localStorage polyfill for happy-dom
│   └── main.ts / index.html
├── public/assets/                    cards/, images/, fonts/, i18n/
├── .storybook/
├── angular.json, proxy.conf.js, transloco.config.ts, eslint.config.js,
└── sonar-project.properties
```

`src/testing/` lives in `src/` (not a test-only folder) because `GameViewComponent` imports `test-game-state` at runtime and Storybook imports `transloco.testing`.

## Routing

`app.routes.ts` — two lazy routes, no guards or resolvers:

- `''` → `MainMenuComponent` (`pathMatch: 'full'`)
- `'game/:id'` → `GameViewComponent` (`pathMatch: 'prefix'`)

There is no wildcard route. The `:id` param is currently ignored — the game view loads a fixture.

## Application config

`app.config.ts` providers: `provideZonelessChangeDetection()`, `provideRouter(routes)`, `provideHttpClient(withInterceptors([authInterceptor]))`, a Bugsnag `ErrorHandler`, and `provideTransloco()`.

Bugsnag is started at module scope with a hardcoded browser API key — that is intentional and safe (browser keys are public).

## Services

| Service | Responsibility |
| --- | --- |
| `AuthService` | `GET /api/auth/info` on construction; exposes `currentUser: Observable<User \| undefined>`. `401` maps to `undefined`. `loginAnonymously()`, `signIn(credentials)` and `logout()` each post, then `switchMap` into `refreshCurrentUser()`, so `currentUser` carries server truth rather than an optimistic guess. `signIn` covers signing in, registering and upgrading an anonymous account — the server picks the branch, so there is no separate "link" call. All return cold observables — nothing is requested until subscription. |
| `DialogService` | Opens a dialog imperatively: `open(Component, { titleKey })` creates a `DialogComponent` into a detached host on `document.body`, mounts the component inside it, and returns an `Observable` of the value that component emits on its `result` output. **One dialog per component type** — a second `open()` for a type already showing returns the existing stream, which is what makes concurrent `401`s share one prompt. Teardown (detach, destroy, remove the host, clear the entry) runs on `result` *or* on the dialog closing by any other route, so no dismissal can strand the service. The content component provides `AH_DIALOG_CONTENT` and exposes `result`; `<ah-dialog>` still accepts projected content declaratively, as `SettingsComponent` uses it. |
| `CardInfoService` | Loads and caches a card's description JSON, translated strings, and traits for a `SetInfo`. Returns a `Signal<CardInfo \| undefined>` from a `Signal<GameCard \| undefined>`. Validates with arktype; on failure caches an `isLoadedWithError` placeholder rather than throwing. |
| `ImagesUrlService` | Maps a typed `ImageDescriptor` tuple to `/assets/images/{...}.webp`. Add new image categories to the `ImageDescriptor` union, not as raw strings. |
| `InputManagerService` | Keyboard command layers. Maps `event.code` → semantic `InputCommand` (`confirm`, `cancel`, `moveUp`…, `toggleDebugPanel`, `resetState`, `applyPatch`), dispatches to the topmost registered layer. `registerGlobal(layer)` sets the fallback layer; `pushLayer(layer)` returns a `LayerRef` with a `destroy()` to pop it. A layer may be a plain object or an `InputLayerProvider` (`() => InputLayer`), resolved on every keystroke — that is how a pushed layer can keep up with state that changes underneath it, including which commands it handles at all, and therefore which ones fall through to the global layer. `Tab` is deliberately swallowed to disable browser tab navigation. Keys originating in a text-entry element (`<textarea>`, `contenteditable`, or an `<input>` of a text-ish type) are exempt from all of this except `Escape` and `Enter` — otherwise typing would fire `confirm` on Space and navigation on WASD, and `Tab` between form fields would be dead. |
| `SettingsService<T>` | Generic localStorage-backed settings. Configured per consumer with the `DEFAULT_SETTINGS` and `STORAGE_KEY_SUFFIX` tokens; persists only the diff against defaults under `ahlcg_{suffix}`. `UserPreferencesService` is the concrete instance. |
| `DebugTimelineService` | Records `createPatch` diffs of store state and replays them (`F9`), or restores the original (`F8`). Game-view scoped. |

`core/list-navigation.ts` sits next to `InputManagerService` but is **not** a service — it is a plain signal factory (`listNavigation({ items, onConfirm?, orientation? })`) called in a field initializer. Given a `Signal` of items it owns the selected index, wrapping in both directions and skipping any item carrying `disabled: true`; there is no predicate to configure, and items without that property are always selectable. It binds one axis — `moveUp`/`moveDown` or `moveLeft`/`moveRight` — leaving the other free, which is why `SettingsComponent` can still spend `moveLeft`/`moveRight` on changing a setting's value.

It returns an `InputLayer` fragment rather than registering one, so **layer lifetime stays with the caller**. That is what lets one helper serve both ownership models: `MenuItemsListComponent` pushes the fragment through `InputManagerService` itself, while `SettingsComponent` spreads it into the handlers `DialogComponent` merges into the layer *it* owns. `DialogComponent` registers that layer as a provider, so content is free to return different handlers as its own state changes — `SignInComponent` swaps a whole view, and `Escape` means something different in each. The helper never touches the DOM or moves focus — a component that needs to show which entry is selected binds a class, as both call sites do.

## Internationalization

Transloco. `TranslocoHttpLoader` fetches `/assets/i18n/{lang}.json`.

- `app.config.ts` enables **en, es, fr, ru, de, it, pl**; `defaultLang`/`fallbackLang` are `en` with `useFallbackTranslation`. Several more (`zh`, `pt`, `cs`, `vi`, `ko`, `uk`) have JSON files and are commented out in the config — uncomment there to enable.
- `transloco.config.ts` (`rootTranslationsPath: public/assets/i18n/`) drives the `loco-join` / `loco-split` keys-manager scripts and lists a wider `langs` array than the app enables.
- **Scopes** are lazily loaded subtrees under `public/assets/i18n/`:
  - `cards/{set}/{index}/{lang}.json` — one file per card, loaded by `CardInfoService`
  - `traits/{lang}.json` — shared trait names
  - `campaigns/notz/…` — campaign/scenario text
- `scopes: { keepCasing: true }` — scope keys are case-sensitive, so paths like `cards/01/002` must match the folder exactly.

Use the `TranslocoDirective` (`*transloco`) in templates; `TranslocoService.load()` for scopes resolved at runtime.

## Styling

Tailwind CSS 4 via `@tailwindcss/postcss`, plus daisyUI 5. `src/styles.css` imports Tailwind, `@toolwind/anchors`, and the jsoneditor dark theme, then declares the custom daisyUI theme `abyss` (dark, `default: true`) with all colour, radius, and size tokens. Change design tokens there; consume them as daisyUI/Tailwind classes or `var(--color-…)`.

## Storybook

Storybook 10 with `@storybook/angular`, `experimentalZoneless: true`, config in `.storybook/`. `preview.ts` provides `getTranslocoModule()` (from `@testing/transloco.testing`) and `provideHttpClient()` globally, so stories render translated text without extra setup. Stories sit next to their component as `{name}.stories.ts` and are excluded from Sonar coverage. Chromatic runs them for visual regression in CI.
