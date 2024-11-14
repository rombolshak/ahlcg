// eslint.config.js
import eslintParserTypeScript from "@typescript-eslint/parser";
import eslintParserHTML from "@html-eslint/parser";
import eslintPluginReadableTailwind from "eslint-plugin-readable-tailwind";

export default [
  {
    files: ["**/*.{ts}"],
    languageOptions: {
      parser: eslintParserTypeScript,
      parserOptions: {
        project: true,
      },
    },
  },
  {
    files: ["**/*.{html}"],
    languageOptions: {
      parser: eslintParserHTML,
    },
  },
  {
    plugins: {
      "readable-tailwind": eslintPluginReadableTailwind,
    },
    rules: {
      // enable all recommended rules to warn
      ...eslintPluginReadableTailwind.configs.warning.rules,
      // enable all recommended rules to error
      ...eslintPluginReadableTailwind.configs.error.rules,

      // or configure rules individually
      "readable-tailwind/multiline": ["warn", { printWidth: 100 }],
    },
  },
];
