import { Translation, TranslocoTestingModule, TranslocoTestingOptions } from '@jsverse/transloco';
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

export const fixtureTranslations: Readonly<Record<string, Translation>> = {
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
};

export function translocoTestingModule(langs: Record<string, Translation>, options: TranslocoTestingOptions = {}) {
  return TranslocoTestingModule.forRoot({
    langs,
    translocoConfig: {
      availableLangs: ['en'],
      defaultLang: 'en',
      scopes: { keepCasing: true },
    },
    preloadLangs: true,
    ...options,
  });
}
