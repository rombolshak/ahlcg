/// <reference types="vite/client" />
import { TranslocoTestingOptions } from '@jsverse/transloco';
import { fixtureTranslations, translocoTestingModule } from './transloco-fixtures';

/**
 * `import.meta.glob`, not a named import per scope: a real `import` statement reaching into
 * `src/app/**` from here would give every scope's folder a two-way edge with `src/testing` — this
 * module is imported by nearly every spec, so the folder it lives in would import back into the
 * folder it just imported from. `no-folder-cycles` (`.dependency-cruiser.mjs`) treats that as a
 * cycle at baseline 0. The glob is a Vite build-time construct, invisible to that static analysis,
 * and `eager: true` keeps it synchronous like the fixture imports.
 */
const scopeModules = import.meta.glob<{ default: Record<string, unknown> }>('/src/app/**/i18n/en.json', { eager: true });

const scopeLangs = Object.fromEntries(
  Object.entries(scopeModules).map(([filePath, module]) => {
    const scope = filePath.slice(filePath.indexOf('/app/') + '/app/'.length).replace(/\/en\.json$/, '');
    return [`${scope}/en`, module.default];
  }),
);

export function getTranslocoModule(options: TranslocoTestingOptions = {}) {
  return translocoTestingModule({ ...fixtureTranslations, ...scopeLangs }, options);
}
