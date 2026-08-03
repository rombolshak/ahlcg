# Frontend Conventions

These are rules, not preferences. Follow them in new code; ESLint (`eslint.config.js`, `strictTypeChecked` + `ngConfigs.tsAll` + `templateAll`) and `tsc` enforce most of them, and the rest are followed consistently throughout `src/`. Where a handful of older files deviate, it is noted below — match the rule, not the outlier.

## Component and directive API

- **Selector prefix is `ah`**, never `app`. Set in `angular.json` (`"prefix": "ah"`) and enforced by `@angular-eslint/component-selector` and `directive-selector`. Components use `kebab-case` element selectors (`ah-numeric-text`); attribute selectors exist for host-style directives (`button[ah-art-button]`).
- **Use `input()` / `input.required()` and `output()`.** `@Input()` and `@Output()` decorators appear nowhere in `src/` and must not be introduced.
- **Use `viewChild()` / `viewChild.required()`**, not `@ViewChild()`.
- **Always set `changeDetection: ChangeDetectionStrategy.OnPush`.** The app is zoneless (`provideZonelessChangeDetection()`); anything else is a bug.
- **Standalone only.** Do not write `standalone: true` — it is the default in Angular 21 and is not spelled out in this codebase. List dependencies in `imports`.
- Put host classes and attributes in the `host: {}` metadata object, not `@HostBinding`.
- Declare members `readonly` unless they are genuinely reassigned, and scope them explicitly: `private` for injected collaborators and internal signals, `protected` for anything only the template reads, `public` only for a real external API.

## Templates

- **Use built-in control flow: `@if`, `@for`, `@switch`, `@let`.** There are zero `*ngIf` / `*ngFor` / `*ngSwitch` in the codebase. `CommonModule` is not imported anywhere.
- Templates live in a sibling `.html` file (`inlineTemplate: false`). Trivially small templates may be inline strings (see `numeric-text.component.ts`).
- Styles are inline (`inlineStyle: true` in the schematic config) and, in practice, expressed as Tailwind utility classes in the template rather than CSS.

## Dependency injection

- **Use `inject()`.** Constructor parameter injection appears nowhere in `src/`. Constructors are for effects and subscriptions only.
- Services are `@Injectable({ providedIn: 'root' })`.
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

## Imports

`tsconfig.json` sets `baseUrl: "src/app"` and these aliases — use them for anything outside the current feature folder:

| Alias | Resolves to |
| --- | --- |
| `@pages/*` | `src/app/pages/*` |
| `@domain/*` | `src/app/shared/domain/*` |
| `@services/*` | `src/app/shared/services/*` |
| `@shared/*` | `src/app/shared/ui/*` |

Use relative imports only for siblings and children within the same feature. (A few older files import bare baseUrl paths like `shared/domain/game-state` — prefer the alias in new code.)

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

Tailwind utility classes in templates. Global CSS, the daisyUI plugin, and the custom `abyss` theme live in `src/styles.css` — that file is the single source of truth for design tokens (`--color-primary`, `--radius-box`, …). Reference tokens through Tailwind/daisyUI class names or `var(--color-…)`; do not hardcode hex values. `eslint-plugin-better-tailwindcss` and `prettier-plugin-tailwindcss` enforce class ordering and validity; `stylelint` covers `.css`.

## Commits

Format is `area: what changed` — `ux: keyboard input manager`, `tests: migrate to vitest`, `deps: bump the aspire group with 3 updates`. The area is the part of the system touched, not a value from a fixed enum.

Subject in the imperative, lowercase after the colon, no trailing period.

`@commitlint/config-conventional` is configured in `package.json` but **no `commit-msg` hook is installed**, so nothing validates messages — and the convention above is not conventional-commits anyway.
