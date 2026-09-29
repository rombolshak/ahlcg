import type { StorybookConfig } from '@storybook/angular-vite';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import type { Plugin } from 'vite';

const workspaceRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

/**
 * `@storybook/angular-vite` does not feed the tsconfig `paths` into Vite's resolver the way the old
 * webpack builder did, so every `@domain/…` / `@pages/…` import fails to resolve. Read the mappings
 * back out of `tsconfig.json` rather than restating them here, so the two cannot drift apart.
 */
function tsconfigAliases(): Record<string, string> {
  const configPath = resolve(workspaceRoot, 'tsconfig.json');
  const { config } = ts.readConfigFile(configPath, path => readFileSync(path, 'utf8'));
  const { options } = ts.parseJsonConfigFileContent(config, ts.sys, workspaceRoot);

  return Object.fromEntries(
    Object.entries(options.paths ?? {}).flatMap(([alias, [target]]) =>
      target ? [[alias.replace(/\/\*$/, ''), resolve(workspaceRoot, target.replace(/\/\*$/, ''))]] : [],
    ),
  );
}

/**
 * Each scope registers its own `en.json`, so Chromatic TurboSnap traces a string change to the
 * stories rendering that scope; importing the strings from `preview.ts` would retake every story.
 */
function registerScopeTranslations(): Plugin {
  return {
    name: 'ahlcg:register-scope-translations',
    transform(code, id) {
      if (!/\/src\/app\/.+\/i18n\/scope\.ts$/.test(id)) return null;

      return `${code}
import en from './en.json';
import { registerStoryTranslation } from '@testing/story-translations';
registerStoryTranslation(\`\${I18N_SCOPE}/en\`, en);
`;
    },
  };
}

const config: StorybookConfig = {
  stories: ['../src/**/*.mdx', '../src/**/*.stories.@(js|jsx|mjs|ts|tsx)'],
  staticDirs: ['../public'],
  addons: ['@storybook/addon-vitest', '@storybook/addon-a11y'],
  framework: {
    name: '@storybook/angular-vite',
    options: {
      compodoc: false,
    },
  },
  viteFinal: viteConfig => ({
    ...viteConfig,
    plugins: [...(viteConfig.plugins ?? []), registerScopeTranslations()],
    resolve: {
      ...viteConfig.resolve,
      alias: { ...tsconfigAliases(), ...viteConfig.resolve?.alias },
    },
  }),
};
export default config;
