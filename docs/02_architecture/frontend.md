# Frontend Architecture

## Purpose
Describes the frontend's component structure, routing, state management approach, and design patterns.

## When to Load
Read this to understand how the frontend is organized and how components interact.

## Related Files
- [Frontend State Management](../03_implementation/frontend/state_management.md) — How the signals store works
- [Frontend UI Patterns](../03_implementation/frontend/ui_patterns.md) — Component conventions and patterns
- [Archive Overview](./overview.md) — How frontend connects to backend
- [Frontend Testing](../04_testing/frontend.md) — How to test components

---

## Frontend Stack

| Aspect | Technology | Version |
|--------|-----------|---------|
| Framework | Angular | 20 |
| Language | TypeScript | ~5.9.3 |
| Build Tool | Angular CLI | ~20.3.0 |
| State Management | @ngrx/signals | Latest |
| Animations | GSAP Flip | Latest |
| Validation | arktype | Latest |
| HTTP | Angular HttpClient | Built-in |
| Real-time | SignalR JS Client | Latest |
| i18n | Transloco | Latest |
| Styling | Tailwind CSS | 4 |
| Testing | Karma + Jasmine | Latest |
| Component Gallery | Storybook | Latest |
| Visual Testing | Chromatic | (CI service) |

---

## Project Structure

```
frontend/
├── src/
│   ├── app/
│   │   ├── app.config.ts              # Providers config (DI, Transloco, Bugsnag)
│   │   ├── app.routes.ts              # Route definitions (lazy-loaded)
│   │   ├── app.component.ts           # Root component (shell)
│   │   ├── transloco-loader.ts        # i18n loader
│   │   │
│   │   ├── pages/                     # Routable pages
│   │   │   ├── main-menu/
│   │   │   │   ├── main-menu.component.ts
│   │   │   │   ├── main-menu.component.html
│   │   │   │   └── *.spec.ts
│   │   │   │
│   │   │   └── game-view/
│   │   │       ├── game-view.component.ts
│   │   │       ├── game-view.component.html
│   │   │       ├── store/
│   │   │       │   ├── game-state.store.ts  # @ngrx/signals store
│   │   │       │   ├── game-state.store.spec.ts
│   │   │       │   └── ...
│   │   │       ├── panels/        # Sub-components
│   │   │       │   ├── investigators-panel/
│   │   │       │   ├── board-panel/
│   │   │       │   └── ...
│   │   │       ├── services/      # Page-local services
│   │   │       │   ├── game.service.ts
│   │   │       │   └── ...
│   │   │       └── *.spec.ts
│   │   │
│   │   └── shared/                    # Reusable across pages
│   │       ├── domain/                # Data models & validation
│   │       │   ├── game-state.ts      # arktype schema
│   │       │   ├── entities/
│   │       │   │   ├── investigator.ts
│   │       │   │   ├── deck.ts
│   │       │   │   └── ...
│   │       │   ├── constants/
│   │       │   ├── helpers/
│   │       │   └── *.spec.ts
│   │       │
│   │       ├── services/              # Shared services (HTTP, auth, etc)
│   │       │   ├── auth.service.ts
│   │       │   ├── api.service.ts
│   │       │   ├── signalr.service.ts
│   │       │   └── *.spec.ts
│   │       │
│   │       └── ui/                    # Reusable UI components
│   │           ├── card-display/
│   │           ├── board/
│   │           ├── modals/
│   │           └── ...
│   │
│   ├── index.html
│   ├── main.ts                        # Application entry
│   └── styles.css                     # Global styles
│
├── public/
│   ├── assets/
│   │   ├── cards/                     # Card image files
│   │   ├── i18n/                      # Translation JSON files
│   │   ├── images/                    # UI images & icons
│   │   └── fonts/                     # Web fonts
│   └── site.webmanifest               # PWA manifest
│
├── .storybook/
│   ├── main.ts                        # Storybook config
│   └── preview.ts                     # Global decorators
│
├── angular.json                       # Build config (dev, build, test, storybook)
├── karma.conf.cjs                     # Test runner config
├── tsconfig.json                      # Base TypeScript config
├── tsconfig.app.json                  # App-specific TS config
├── tsconfig.spec.json                 # Test-specific TS config
├── eslint.config.js                   # Linting rules
├── package.json                       # Dependencies
├── transloco.config.ts                # i18n config
└── sonar-project.properties           # SonarCloud config
```

---

## Routing

Defined in `app.routes.ts`.

**Key Characteristics:**
- Lazy-loaded pages for code-splitting
- Child routes can be added for sub-pages
- Supports deep linking (e.g., `/game/123`)
- Can be extended with guards, resolvers, etc.

---

## State Management: Signal Store

The frontend uses `@ngrx/signals` for reactive state:

```typescript
export const GameStateStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),           // Initial state shape
  withComputed(...),                 // Memoized selectors
  withMethods(...),                  // Synchronous & async methods
);
```

**Flow:**
1. **Initialization:** Component calls `store.setState(initialGameState)`
2. **Patches:** Server sends RFC6902 patches
3. **Application:** Component calls `store.updateState(patches)`
4. **Animation:** GSAP Flip animates DOM changes
5. **Rendering:** Angular automatically updates view (zoneless CD)

See [Frontend State Management](../03_implementation/frontend/state_management.md) for implementation details.

---

## Component Patterns

### Smart Components (Pages)
- Located in `pages/`
- Handle routing, data fetching, store management
- Example: `GameViewComponent`

### Presentational Components (Dumb)
- Located in `shared/ui/` or `pages/*/panels/`
- Receive data via `@Input()` and emit events via `@Output()`
- Focused on rendering and user interaction
- Highly reusable

### Standalone Components
All components are standalone (Angular 14+) for better tree-shaking and modularity.

### Services
- Grouped by purpose: `auth.service.ts`, `api.service.ts`, `signalr.service.ts`
- Singleton by default (@Injectable({ providedIn: 'root' }))
- Dependency injection via constructor

---

## Internationalization (i18n)

Powered by **Transloco**:

```typescript
// In templates:
<h1>{{ 'HOME.WELCOME' | transloco }}</h1>

// In components:
this.transloco.selectTranslate('GAME.TURN_START').subscribe(...)
```

**Translation Files:**
- Located in `public/assets/i18n/{lang}.json`
- Supported languages: EN, DE, FR, ES, PT, IT, RU, UK, VI, CS, KO, ZH
- Fallback language: English

---

## Styling

**Tailwind CSS** for utility-first styling:

```html
<div class="flex gap-4 p-6 bg-slate-50 rounded-lg">
  <button class="px-4 py-2 bg-blue-600 text-white rounded">Click</button>
</div>
```

**Global Styles:** `src/styles.css`
**Component Styles:** Can use inline `styles` or `styleUrls` (avoid inline; use component files)

---

## Validation & Type Safety

**arktype** for runtime schema validation:

```typescript
export const gameState = type({
  investigators: array(investigator),
  acts: array(act),
  agendas: array(agenda),
}).narrow((state, ctx) => {
  // Custom cross-entity validation
  if (state.investigators.length === 0) {
    ctx.missing('At least one investigator required')
  }
  return state;
})
```

**Benefits:**
- Type-safe at compile time (TypeScript)
- Validated at runtime (arktype)
- Client-side validation before sending to server
- Clear error messages for invalid data

---

## Testing Strategy

- **Unit Tests:** Jasmine specs for services, pipes, validators
- **Component Tests:** Component + template rendering with mocked dependencies
- **Store Tests:** Verify state transitions and computed selectors
- **Visual Regression:** Storybook + Chromatic for component appearance

See [Frontend Testing](../04_testing/frontend.md) for details.

---

## Real-Time Updates

**SignalR** handles bi-directional communication:

1. **Connect:** User joins game → SignalR subscribes to `/game` hub
2. **Receive:** Hub broadcasts updates → Client receives via `on('message', ...)`
3. **Apply:** SignalR client calls `store.updateState(patch)`
4. **Animate:** GSAP Flip transition triggers
5. **Render:** Angular re-renders the updated view

See [Backend Architecture](./backend.md) (SignalR section) for server-side details.

---

## Dependency Injection (DI) Configuration

Configured in `app.config.ts`:

```typescript
export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    provideHttpClient(...),      // HttpClient + interceptors
    provideTransloco(...),        // i18n
    provideAnimationsAsync(),      // Angular animations
    Bugsnag.start(...),           // Error tracking
    // Custom providers...
  ],
};
```

All services registered here are available application-wide.

---

## Browser Support

- **Chrome:** Latest
- **Firefox:** Latest
- **Safari:** Latest (iOS 12+)
- **Edge:** Latest

No IE11 support (Angular 20+ dropped classic IE).

---

## Performance Optimizations

- **Change Detection:** Zoneless (`provideExperimentalZonelessChangeDetection()`), manual CD via signals
- **Lazy Loading:** Routes lazy-loaded on demand
- **OnPush Strategy:** Components with `ChangeDetectionStrategy.OnPush` for efficiency
- **Memoization:** @ngrx/signals computes dependencies reactively
- **Asset Caching:** Service worker (PWA) caches assets for offline access
- **HTTP Caching:** API responses can be cached with appropriate headers

---

## Accessibility (a11y)

- ARIA labels for interactive elements
- Semantic HTML (`<button>`, `<nav>`, `<article>`, etc.)
- Color contrast ratios >= 4.5:1
- Keyboard navigation support
- Focus management in dialogs

---

## Security Considerations

- **XSS Prevention:** Angular auto-escapes template interpolation
- **CSRF:** Handled by backend cookie attributes (SameSite, HTTPS)
- **Content Security Policy:** Can be enforced via HTTP headers
- **API Keys:** Bugsnag key is public (acceptable for browser error tracking)

See [Security & Secrets](../05_operations/security.md) for full details.
