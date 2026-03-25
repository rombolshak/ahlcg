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
- Tailwind directives (`@tailwind base; @tailwind components; @tailwind utilities;`)

### Example

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --rounded-md: 0.5rem;
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

