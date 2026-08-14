import type { StorybookConfig } from '@storybook/angular-vite';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

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
    resolve: {
      ...viteConfig.resolve,
      alias: { ...tsconfigAliases(), ...viteConfig.resolve?.alias },
    },
  }),
};
export default config;
