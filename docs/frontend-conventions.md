# Frontend Conventions

These are rules, not preferences. Follow them in new code; ESLint (`eslint.config.js`, `strictTypeChecked` + `ngConfigs.tsAll` + `templateAll`) and `tsc` enforce most of them, and the rest are followed consistently throughout `src/`. Where a handful of older files deviate, it is noted below — match the rule, not the outlier.

## Component and directive API

- **Selector prefix is `ah`**, never `app`. Set in `angular.json` (`"prefix": "ah"`) and enforced by `@angular-eslint/component-selector` and `directive-selector`. Components use `kebab-case` element selectors (`ah-numeric-text`); attribute selectors exist for host-style directives (`button[ah-art-button]`).
- **Use `input()` / `input.required()` and `output()`.** `@Input()` and `@Output()` decorators appear nowhere in `src/` and must not be introduced.
- **Use `viewChild()` / `viewChild.required()`**, not `@ViewChild()`.
- **Always set `changeDetection: ChangeDetectionStrategy.OnPush`.** The app is zoneless (`provideZonelessChangeDetection()`); anything else is a bug.
- **Standalone only.** Do not write `standalone: true` — it is the default in Angular 22 and is not spelled out in this codebase. List dependencies in `imports`.
- Put host classes and attributes in the `host: {}` metadata object, not `@HostBinding`.
- Declare members `readonly` unless they are genuinely reassigned, and scope them explicitly: `private` for injected collaborators and internal signals, `protected` for anything only the template reads, `public` only for a real external API.

## Templates

- **Use built-in control flow: `@if`, `@for`, `@switch`, `@let`.** There are zero `*ngIf` / `*ngFor` / `*ngSwitch` in the codebase. `CommonModule` is not imported anywhere.
- Templates live in a sibling `.html` file (`inlineTemplate: false`). Trivially small templates may be inline strings (see `numeric-text.component.ts`).
- Styles are inline (`inlineStyle: true` in the schematic config) and, in practice, expressed as Tailwind utility classes in the template rather than CSS.

## Dependency injection

- **Use `inject()`.** Constructor parameter injection appears nowhere in `src/`. Constructors are for effects and subscriptions only.
- Services are `@Service()` — Angular 22's replacement for `@Injectable({ providedIn: 'root' })`, enforced by `@angular-eslint/prefer-service-decorator`.
- Configure generic/reusable services with `InjectionToken`s — see `SettingsService` with `DEFAULT_SETTINGS` and `STORAGE_KEY_SUFFIX`.

## Files and naming

| Kind | Pattern | Example |
| --- | --- | --- |
| Component | `{name}.component.ts` + `.html` | `numeric-text.component.ts` |
| Spec | `{file}.spec.ts` next to the source | `numeric-text.component.spec.ts` |
| Story | `{name}.stories.ts` next to the component | `numeric-text.stories.ts` |
| Service | `{name}.service.ts` | `card-info.service.ts` |
| Directive | `{name}.directive.ts` | `card-outline.directive.ts` |
| Pipe | `{name}.pipe.ts` | `with-ah-symbols.pipe.ts` |
| Store | `{name}.store.ts` | `game-state.store.ts` |
| Domain model | `{name}.model.ts` | `investigator.model.ts` |

Files are kebab-case; classes are `PascalCase` with the matching suffix (`NumericTextComponent`, `CardInfoService`). No `I` prefix on interfaces.

## Domain models

Each `*.model.ts` in `@domain/entities` exports an arktype schema in `camelCase` and its type in `PascalCase` from the same file. Two idioms are load-bearing:

**Interface indirection for recursive or composed schemas.** Deeply composed `.and()`/`.or()` chains blow up TypeScript's inference, so the schema is built under a `_`-prefixed name, its inferred type is re-declared as an empty-extending `interface`, and the schema is re-exported with an explicit annotation:

```typescript
const _investigator = gameCard.and({ /* ... */ });
type _Investigator = typeof _investigator.infer;

/* eslint-disable-next-line @typescript-eslint/no-empty-object-type */
export interface Investigator extends _Investigator {}
export const investigator: type<Investigator> = _investigator;
```

Copy this shape for any new composed entity. Simple leaf schemas (`vitals`, `skills`) use the plain `export const x = type({...}); export type X = typeof x.infer;` form.

**Branded ids.** `entityId` is `string.integer`, and each entity type brands it: `export const actId = entityId.brand('act')`. A raw `string` will not satisfy `ActId`. Produce ids by validating through the schema, never by casting. `playerCardId` is the union `assetId | skillId | eventId`.

## Where a new file goes

`src/app/` has five layers, and imports flow one way through them:

```
pages ──→ features ──→ ui ──→ domain
  │           │         │        ↑
  └───────────┴────→ core ───────┘
```

`pages/` and `features/` may reach down into anything below them; `ui/` may depend on `ui/` and
`domain/` only (its `kit/` and `game/` subtrees are peers, not layers — `kit/` takes primitives,
`game/` takes domain models, neither imports the other); `core/` may depend on `core/`, `domain/`
and `ui/kit/` (not `ui/game/`, `features/` or `pages/`); `domain/` imports nothing else from
`src/app` and no framework (no `@angular/*`, `@jsverse/*`, `@ngrx/*`). These are enforced —
`.dependency-cruiser.mjs` for the folder rules, an ESLint `no-restricted-imports` for the domain
framework ban — so a violation fails `npm run lint`, not just review.

Deciding where a new file belongs is four questions, asked in order:

1. **How many hosts will use it?** One host and it stays local — a private child reached by a
   relative import from inside whatever imports it, not a new layer entry at all. A second host is
   what earns it a place in one of the shared layers below; being generic or "obviously reusable"
   does not, on its own, promote it. The only trigger for moving something into `ui/` is a second
   host appearing.
2. **Does it inject a service, hold state, or otherwise know about the app's runtime?** If yes, it
   is not `ui/` — `ui/` is dumb, presentational, and driven entirely by inputs. It is either
   `core/`, `features/`, or a page-local piece under `pages/`.
3. **Is it one-per-app and without a template of its own?** A cross-cutting service with no
   domain-specific business logic — `SettingsService`, `InputManagerService`, `DialogService` — is
   `core/`. **A service and the component it creates imperatively are one module**: `DialogService`
   creates `DialogComponent` at runtime, so `DialogComponent` lives in `core/dialog/` next to it
   rather than in `ui/`, even though it has a template.
4. **Otherwise, it is `features/`.** Business logic that knows about *this app* — anonymous
   accounts and ASP.NET Identity error payloads (`SignInComponent`), which card fields to resolve
   and switch on (`features/card/`) — not a generic capability.

The steps-3-vs-4 tiebreaker in one line: **does it know anything about *this app*, or would it work
unchanged in a different Angular project?** `ConfirmDialogService` is `window.confirm` with
styling — it would work anywhere, so `core/`. `SignInComponent` knows about anonymous accounts and
ASP.NET Identity error payloads — it would not, so `features/`.

**A feature's internals are not lint-enforced, but the convention is real.** `#541` asked that
`features/*/*` be unimportable from outside so that only a feature's public entry is reachable —
that cannot be built as a lint rule: there is no `index.ts` barrel (banned below) to mark the public
surface, and path depth does not distinguish a public entry (`features/auth/sign-in/sign-in.component.ts`)
from a private child (`features/settings/account/account.component.ts`) — both are
`<folder>/<folder>.component.ts` at the same depth under `features/`. What actually separates them
is host count (question 1 above), which a path glob cannot see. So it is convention rather than a
rule: every private child is reached only by a relative import from inside its own feature, and
every `@features/*` import from outside a feature targets a real entry component.

## Imports

`tsconfig.json` sets these path aliases — use them for anything outside the current feature folder:

| Alias | Resolves to |
| --- | --- |
| `@pages/*` | `src/app/pages/*` |
| `@domain/*` | `src/app/domain/*` |
| `@core/*` | `src/app/core/*` |
| `@ui/*` | `src/app/ui/*` |
| `@features/*` | `src/app/features/*` |
| `@testing/*` | `src/testing/*` |

`@domain/testing/*` fixtures are reached through `@domain/*` above and need no alias of their own.

Use relative imports only for siblings and children within the same feature. There is no `baseUrl`, so bare paths like `domain/game-state` do not resolve.

No `index.ts` re-export files: import the symbol from the module that declares it, so the bundler can tree-shake.

## TypeScript strictness

`tsconfig.json` enables `strict` plus `exactOptionalPropertyTypes`, `noUncheckedIndexedAccess`, `noPropertyAccessFromIndexSignature`, `noUnusedLocals`, `noUnusedParameters`, `noImplicitReturns`, `noImplicitOverride`, and `strictTemplates`. Consequences you will hit:

- Indexing an array or record yields `T | undefined`. Narrow it; do not assert.
- `foo?: string` and `foo: string | undefined` are not interchangeable.
- Record properties need bracket access unless declared.

Suppress with a narrowly scoped `// eslint-disable-next-line` or `@ts-expect-error` plus a reason, as `card-info.service.ts` does when building an object before validating it. Never widen types to `any`.

## Validation

Runtime data (anything from HTTP, storage, or a fixture) is validated with arktype at the boundary, and failures are surfaced via `ArkErrors`:

```typescript
const model = cardDescription(raw);
if (model instanceof ArkErrors) {
  console.error('...', model.summary);
  return model.throw();
}
```

## Styling

Tailwind utility classes in templates. Global CSS, the daisyUI plugin, and the custom `abyss` theme live in `src/styles.css` — that file is the single source of truth for design tokens (`--color-primary`, `--radius-box`, …). Reference tokens through Tailwind/daisyUI class names or `var(--color-…)`; do not hardcode hex values. `eslint-plugin-better-tailwindcss` enforces class ordering and validity; `stylelint` covers `.css`. Custom utilities go in `@utility` blocks — classes declared under `@layer utilities` are invisible to the linter. Prettier owns whitespace inside a `class` attribute in `.html`, so that rule never wraps there; inline templates in `.ts` do wrap at 160.

## Commits

Format is `area: what changed` — `ux: keyboard input manager`, `tests: migrate to vitest`, `deps: bump the aspire group with 3 updates`. The area is the part of the system touched, not a value from a fixed enum.

Subject in the imperative, lowercase after the colon, no trailing period.

`@commitlint/config-conventional` is configured in `package.json` but **no `commit-msg` hook is installed**, so nothing validates messages — and the convention above is not conventional-commits anyway.
