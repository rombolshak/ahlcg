import {
  TranslocoTestingModule,
  TranslocoTestingOptions,
} from '@jsverse/transloco';
import en from '../../../../../public/assets/i18n/en.json';
import traits from '../../../../../public/assets/i18n/traits/en.json';
import daisyWalker from '../../../../../public/assets/i18n/cards/01/002/en.json';
import icyGhoul from '../../../../../public/assets/i18n/cards/01/119/en.json';
import plan from '../../../../../public/assets/i18n/cards/02/107/en.json';
import museum from '../../../../../public/assets/i18n/cards/02/126/en.json';
import beast from '../../../../../public/assets/i18n/cards/02/200/en.json';
import breakingThrough from '../../../../../public/assets/i18n/cards/02/314/en.json';
import notes from '../../../../../public/assets/i18n/cards/09/045/en.json';
import accursed from '../../../../../public/assets/i18n/cards/10/095/en.json';

export function getTranslocoModule(options: TranslocoTestingOptions = {}) {
  return TranslocoTestingModule.forRoot({
    langs: {
      en,
      'traits/en': traits,
      'cards/01/119/en': icyGhoul,
      'cards/01/002/en': daisyWalker,
      'cards/02/107/en': plan,
      'cards/02/126/en': museum,
      'cards/02/200/en': beast,
      'cards/02/314/en': breakingThrough,
      'cards/09/045/en': notes,
      'cards/10/095/en': accursed,
    },
    translocoConfig: {
      availableLangs: ['en'],
      defaultLang: 'en',
    },
    preloadLangs: true,
    ...options,
  });
}
