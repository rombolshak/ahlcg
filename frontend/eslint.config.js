// For more info, see https://github.com/storybookjs/eslint-plugin-storybook#configuration-flat-config-format
import eslint from "@eslint/js";
import { configs as ngConfigs, processInlineTemplates } from "angular-eslint";
import prettierConfig from "eslint-config-prettier";
import jasminePlugin from "eslint-plugin-jasmine";
import { configs as jsoncConfigs } from "eslint-plugin-jsonc";
import globals from "globals";
import { config, configs as tsConfigs } from "typescript-eslint";

export default config(
  {
    ignores: [
      ".angular/*",
      ".storybook/*",
      "dist/*",
      "coverage/*",
      "eslint.config.js",
      "karma.conf.cjs",
    ],
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
    extends: [
      eslint.configs.recommended,
      ...tsConfigs.strictTypeChecked,
      ...tsConfigs.stylisticTypeChecked,
      ...ngConfigs.tsAll,
      prettierConfig,
    ],
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
    extends: [
      ...jsoncConfigs["flat/recommended-with-jsonc"],
      ...jsoncConfigs["flat/prettier"],
    ],
    rules: {},
  },
  {
    files: ["src/**/*.spec.ts"],
    extends: [jasminePlugin.configs.recommended, prettierConfig],
    languageOptions: {
      globals: {
        ...globals.jasmine,
      },
    },
    plugins: { jasmine: jasminePlugin },
    rules: {
      "@typescript-eslint/no-unsafe-member-access": "off",
    },
  },
);
