// For more info, see https://github.com/storybookjs/eslint-plugin-storybook#configuration-flat-config-format
import eslint from "@eslint/js";

import vitest from "@vitest/eslint-plugin";
import { configs as ngConfigs, processInlineTemplates } from "angular-eslint";
import prettierConfig from "eslint-config-prettier";
import eslintPluginBetterTailwindcss from "eslint-plugin-better-tailwindcss";
import { configs as jsoncConfigs } from "eslint-plugin-jsonc";
import { defineConfig } from "eslint/config";
import globals from "globals";
import { configs as tsConfigs } from "typescript-eslint";

export default defineConfig(
  {
    ignores: [".angular/*", ".storybook/*", "dist/*", "coverage/*", "eslint.config.js", "karma.conf.cjs"],
  },
  {
    files: ["**/*.js"],
    extends: [eslint.configs.recommended, prettierConfig],
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
    rules: {},
  },
  {
    files: ["**/*.ts"],
    extends: [eslint.configs.recommended, ...tsConfigs.strictTypeChecked, ...tsConfigs.stylisticTypeChecked, ...ngConfigs.tsAll, prettierConfig],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    processor: processInlineTemplates,
    rules: {
      "@angular-eslint/directive-selector": [
        "error",
        {
          type: "attribute",
          prefix: "ah",
          style: "camelCase",
        },
      ],
      "@angular-eslint/component-selector": [
        "error",
        {
          type: "element",
          prefix: "ah",
          style: "kebab-case",
        },
      ],
      "@angular-eslint/no-developer-preview": "off",
      "@angular-eslint/template/no-call-expression": "off",
      "@angular-eslint/component-max-inline-declarations": [
        "error",
        {
          template: 10,
        },
      ],
      "@typescript-eslint/ban-ts-comment": [
        "error",
        {
          "ts-ignore": "allow-with-description",
        },
      ],
    },
  },
  {
    files: ["**/*.html"],
    extends: [...ngConfigs.templateAll, ...ngConfigs.templateAccessibility],
    rules: {
      "@angular-eslint/template/i18n": "off",
      "@angular-eslint/template/no-call-expression": "off",
    },
  },
  {
    files: ["**/*.json"],
    extends: [...jsoncConfigs["flat/recommended-with-jsonc"], ...jsoncConfigs["flat/prettier"]],
    rules: {},
  },
  {
    // The domain layer is plain TypeScript with no framework dependency, so anything else can
    // import it without dragging Angular along. Both globs point at the same folder: `shared/domain`
    // today, `domain` once #541 moves it — this rule drops the first glob at that point instead of
    // being rewritten.
    files: ["src/app/shared/domain/**/*.ts", "src/app/domain/**/*.ts"],
    rules: {
      "no-restricted-imports": [
        "warn",
        {
          patterns: [
            {
              group: ["@angular", "@angular/*"],
              message: "The domain layer must stay framework-free. Move Angular-dependent code out of domain/.",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["src/**/*.spec.ts"],
    extends: [vitest.configs.recommended, prettierConfig],
    languageOptions: {
      globals: {
        ...globals.vitest,
        ...vitest.environments.env.globals,
      },
    },
    plugins: { vitest },
    rules: {
      "@typescript-eslint/no-unsafe-member-access": "off",
      // Assertions often sit in a per-spec `checkX`/`validateX` helper, or in HttpTestingController,
      // whose `expect*` methods throw on their own.
      "vitest/expect-expect": ["error", { assertFunctionNames: ["expect", "http.expect*", "check*", "validate*"] }],
    },
  },
  {
    plugins: {
      "better-tailwindcss": eslintPluginBetterTailwindcss,
    },
    rules: {
      ...eslintPluginBetterTailwindcss.configs["recommended-warn"].rules,
      ...eslintPluginBetterTailwindcss.configs["recommended-error"].rules,

      // or configure rules individually
      "better-tailwindcss/enforce-consistent-line-wrapping": ["warn", { strictness: "loose", preferSingleLine: true, printWidth: 160 }],
      "better-tailwindcss/no-unknown-classes": [
        "warn",
        {
          detectComponentClasses: true,
          // Classes that exist outside anything Tailwind compiles: a component's own `styles`,
          // the splash screen's inline <style> in index.html, and vanilla-jsoneditor's theme.
          ignore: ["^active$", "^background$", "^progress-(track|fill)$", "^jse-theme-dark$"],
        },
      ],
    },
    settings: {
      "better-tailwindcss": {
        entryPoint: "./src/styles.css",
      },
    },
  },
  {
    // Prettier's HTML printer collapses a class attribute back onto one line however long it gets, so
    // in real templates the two tools would undo each other forever. printWidth 0 means "never wrap",
    // which is what prettier produces. Inline templates keep wrapping — they live in template literals,
    // which prettier leaves alone.
    files: ["**/*.html"],
    // `processInlineTemplates` presents inline templates as virtual .html files under their .ts path.
    ignores: ["**/*.ts/**"],
    rules: {
      "better-tailwindcss/enforce-consistent-line-wrapping": ["warn", { strictness: "loose", preferSingleLine: true, printWidth: 0 }],
    },
  },
);
