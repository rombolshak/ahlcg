/// <reference types="vite/client" />
import { TranslocoTestingModule, TranslocoTestingOptions } from '@jsverse/transloco';
import campaign from '../../public/assets/i18n/campaigns/notz/en.json';
import scenario from '../../public/assets/i18n/campaigns/notz/mm/en.json';
import daisyWalker from '../../public/assets/i18n/cards/01/002/en.json';
import icyGhoul from '../../public/assets/i18n/cards/01/119/en.json';
import plan from '../../public/assets/i18n/cards/02/107/en.json';
import museum from '../../public/assets/i18n/cards/02/126/en.json';
import beast from '../../public/assets/i18n/cards/02/200/en.json';
import breakingThrough from '../../public/assets/i18n/cards/02/314/en.json';
import notes from '../../public/assets/i18n/cards/09/045/en.json';
import accursed from '../../public/assets/i18n/cards/10/095/en.json';
import traits from '../../public/assets/i18n/traits/en.json';

/**
 * `import.meta.glob`, not a named import per scope: a real `import` statement reaching into
 * `src/app/**` from here would give every scope's folder a two-way edge with `src/testing` — this
 * module is imported by nearly every spec, so the folder it lives in would import back into the
 * folder it just imported from. `no-folder-cycles` (`.dependency-cruiser.mjs`) treats that as a
 * cycle at baseline 0. The glob is a Vite build-time construct, invisible to that static analysis,
 * and `eager: true` keeps it synchronous like the rest of this file's fixtures.
 */
const scopeModules = import.meta.glob<{ default: Record<string, unknown> }>('/src/app/**/en.json', { eager: true });

const scopeLangs = Object.fromEntries(
  Object.entries(scopeModules).map(([filePath, module]) => {
    const scope = filePath.slice(filePath.indexOf('/app/') + '/app/'.length).replace(/\/en\.json$/, '');
    return [`${scope}/en`, module.default];
  }),
);

export function getTranslocoModule(options: TranslocoTestingOptions = {}) {
  return TranslocoTestingModule.forRoot({
    langs: {
      // Mirrors `TranslocoHttpLoader` short-circuiting a bare language to `{}` — there is no root
      // scope, but the unscoped `*transloco` blocks that render card data still request one.
      en: {},
      'traits/en': traits,
      'cards/01/119/en': icyGhoul,
      'cards/01/002/en': daisyWalker,
      'cards/02/107/en': plan,
      'cards/02/126/en': museum,
      'cards/02/200/en': beast,
      'cards/02/314/en': breakingThrough,
      'cards/09/045/en': notes,
      'cards/10/095/en': accursed,
      'campaigns/notz/en': campaign,
      'campaigns/notz/mm/en': scenario,
      ...scopeLangs,
    },
    translocoConfig: {
      availableLangs: ['en'],
      defaultLang: 'en',
      scopes: { keepCasing: true },
    },
    preloadLangs: true,
    ...options,
  });
}
