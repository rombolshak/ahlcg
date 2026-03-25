# UI Styling Patterns

## Purpose
Define styling conventions, Tailwind usage, and global style rules for frontend components.

## When to Load
Read this when implementing or reviewing UI styles for matching project look and feel.

## Related Files
- [UI Patterns](./ui_patterns.md)
- [Conventions](../../99_reference/conventions.md)
- [Component Patterns](./ui_components.md)

---

## Tailwind Utility Usage

Use utility classes for most component styling; avoid large local CSS classes.

```html
<div class="flex gap-4 p-6 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg shadow-lg">
  <img src="investigator.jpg" class="w-24 h-24 rounded-full object-cover" />
  <div class="flex flex-col justify-center">
    <h3 class="text-xl font-bold text-white">Roland Banks</h3>
    <p class="text-blue-100">Guardian</p>
  </div>
</div>
```

### Avoid Bulky Scoped CSS

❌ Avoid embedding large block styles in component HTML:

```html
<style>
  .investigator-card {
    display: flex;
    gap: 1rem;
    padding: 1.5rem;
    /* ... many lines ... */
  }
</style>
<div class="investigator-card">...</div>
```

Use utilities and custom classes sparingly.

---

## Global Styles

Global styles are in `src/styles.css`:

- Base resets and typography
- Dark/light theme variables
- Tailwind v4 import/plugin approach (e.g. `@import "tailwindcss";`, `@plugin "daisyui";`, `@plugin "daisyui/theme" { ... }` in `src/styles.css`)

### Example

```css
@import "tailwindcss";
@import "@toolwind/anchors";
@import "vanilla-jsoneditor/themes/jse-theme-dark.css";

@plugin "daisyui";

@plugin "daisyui/theme" {
  name: "abyss";
  default: true;
  prefersdark: true;
  color-scheme: "dark";

  --color-base-100: oklch(20% 0.08 209deg);
  --color-base-200: oklch(15% 0.08 209deg);
  --color-base-300: oklch(10% 0.08 209deg);
  --color-base-content: oklch(90% 0.076 70.697deg);
  --color-primary: oklch(47% 0.157 37.304deg);
  --color-primary-content: oklch(90% 0.076 70.697deg);
  --color-secondary: oklch(43% 0.095 166.913);
  --color-secondary-content: oklch(95% 0.051 180.801deg);
  --color-accent: oklch(43% 0 0deg);
  --color-accent-content: oklch(98% 0.022 95.277deg);
  --color-neutral: oklch(30% 0.08 209deg);
  --color-neutral-content: oklch(90% 0.076 70.697deg);
  --color-info: oklch(74% 0.16 232.661deg);
  --color-info-content: oklch(29% 0.066 243.157deg);
  --color-success: oklch(62% 0.194 149.214);
  --color-success-rgb: #00a43b;
  --color-success-content: oklch(26% 0.065 152.934deg);
  --color-warning: oklch(84.8% 0.1962 84.62deg);
  --color-warning-content: oklch(44.8% 0.1962 84.62deg);
  --color-error: oklch(65% 0.1985 24.22deg);
  --color-error-rgb: #f04e4f;
  --color-error-content: oklch(27% 0.1985 24.22deg);
  --radius-selector: 1rem;
  --radius-field: 0.5rem;
  --radius-box: 1rem;
  --size-selector: 0.25rem;
  --size-field: 0.25rem;
  --border: 1px;
  --depth: 1;
  --noise: 0;
}

body {
  font-family: 'Inter', ui-sans-serif, system-ui;
}
```

---

## Component CSS Scope

- Keep local styles for subtle adjustments and state-specific classes
- Prefer `class` bindings for dynamic states

```html
<button class="px-4 py-2 rounded" [class.bg-green-500]="isActive" [class.bg-gray-400]="!isActive">Activate</button>
```

---

## Accessibility & Color Contrast

- Use high contrast text (`text-white` on dark backgrounds)
- Ensure interactive elements have focus styles

```html
<button class="focus:outline-none focus:ring-2 focus:ring-blue-400">…</button>
```

- Avoid hidden toggles that rely only on color.

