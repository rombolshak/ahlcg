# Frontend

Angular 21 SPA in `frontend/`. Read [frontend-conventions.md](frontend-conventions.md) before writing any code here.

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
│   │   └── shared/
│   │       ├── domain/               arktype schemas + inferred types
│   │       │   ├── entities/         act, agenda, enemy, location, investigator,
│   │       │   │                     card, player-card, id models; details/
│   │       │   ├── game-state.ts     root schema
│   │       │   ├── game-entity.ts    entity union + type guards
│   │       │   ├── game-map.model.ts, meta-info.ts, action.model.ts,
│   │       │   │   card.constants.ts, display.options.ts
│   │       │   └── test/             fixtures + test helpers (shipped in src, see below)
│   │       ├── services/             auth, card-info, images-url, input-manager, settings/
│   │       └── ui/
│   │           ├── components/       cards/, dialog/, settings/, art-button/, art-panel/,
│   │           │                     numeric-text/, vitals-bar/, svg/, json-editor/,
│   │           │                     text-with-overlay/
│   │           ├── directives/cards/ card-background, card-faction-background, card-outline
│   │           └── pipes/            as, trim-start, with-ah-symbols
│   ├── styles.css                    Tailwind + daisyUI theme (design tokens)
│   ├── test-setup.ts                 localStorage polyfill for happy-dom
│   └── main.ts / index.html
├── public/assets/                    cards/, images/, fonts/, i18n/
├── .storybook/
├── angular.json, proxy.conf.js, transloco.config.ts, eslint.config.js,
└── sonar-project.properties
```

`shared/domain/test/` lives in `src/` (not a test-only folder) because `GameViewComponent` imports `test-game-state` at runtime and Storybook imports `transloco.testing`.

## Routing

`app.routes.ts` — two lazy routes, no guards or resolvers:

- `''` → `MainMenuComponent` (`pathMatch: 'full'`)
- `'game/:id'` → `GameViewComponent` (`pathMatch: 'prefix'`)

There is no wildcard route. The `:id` param is currently ignored — the game view loads a fixture.

## Application config

`app.config.ts` providers: `provideZonelessChangeDetection()`, `provideRouter(routes)`, `provideHttpClient()` (no interceptors), a Bugsnag `ErrorHandler`, and `provideTransloco()`.

Bugsnag is started at module scope with a hardcoded browser API key — that is intentional and safe (browser keys are public).

## Services

| Service | Responsibility |
| --- | --- |
| `AuthService` | `GET /api/auth/info` on construction; exposes `currentUser: Observable<User \| undefined>`. `401` maps to `undefined`. `refreshCurrentUser()` re-fetches. |
| `CardInfoService` | Loads and caches a card's description JSON, translated strings, and traits for a `SetInfo`. Returns a `Signal<CardInfo \| undefined>` from a `Signal<GameCard \| undefined>`. Validates with arktype; on failure caches an `isLoadedWithError` placeholder rather than throwing. |
| `ImagesUrlService` | Maps a typed `ImageDescriptor` tuple to `/assets/images/{...}.webp`. Add new image categories to the `ImageDescriptor` union, not as raw strings. |
| `InputManagerService` | Keyboard command layers. Maps `event.code` → semantic `InputCommand` (`confirm`, `cancel`, `moveUp`…, `toggleDebugPanel`, `resetState`, `applyPatch`), dispatches to the topmost registered layer. `registerGlobal(layer)` sets the fallback layer; `pushLayer(layer)` returns a `LayerRef` with a `destroy()` to pop it. `Tab` is deliberately swallowed to disable browser tab navigation. |
| `SettingsService<T>` | Generic localStorage-backed settings. Configured per consumer with the `DEFAULT_SETTINGS` and `STORAGE_KEY_SUFFIX` tokens; persists only the diff against defaults under `ahlcg_{suffix}`. `UserPreferencesService` is the concrete instance. |
| `DebugTimelineService` | Records `createPatch` diffs of store state and replays them (`F9`), or restores the original (`F8`). Game-view scoped. |

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

Storybook 10 with `@storybook/angular`, `experimentalZoneless: true`, config in `.storybook/`. `preview.ts` provides `getTranslocoModule()` (from `@domain/test/transloco.testing`) and `provideHttpClient()` globally, so stories render translated text without extra setup. Stories sit next to their component as `{name}.stories.ts` and are excluded from Sonar coverage. Chromatic runs them for visual regression in CI.
