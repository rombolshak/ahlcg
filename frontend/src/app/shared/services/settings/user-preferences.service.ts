import { Provider } from '@angular/core';
import { TranslocoService } from '@jsverse/transloco';
import { type } from 'arktype';
import {
  DEFAULT_SETTINGS,
  SettingsService,
  STORAGE_KEY_SUFFIX,
} from './settings.service';

const userPreferences = type({
  lang: 'string',
});

export type UserPreferences = typeof userPreferences.infer;

export function provideUserPreferencesService(): Provider {
  return [
    { provide: STORAGE_KEY_SUFFIX, useValue: 'user-preferences' },
    {
      provide: DEFAULT_SETTINGS,
      useFactory: (transloco: TranslocoService) => {
        const available = transloco.getAvailableLangs();
        const preferred = navigator.languages.find(
          (lang) =>
            available.findIndex((a) =>
              typeof a === 'string' ? a === lang : a.id === lang,
            ) !== -1,
        );

        return userPreferences.assert({
          lang: preferred ?? transloco.getDefaultLang(),
        });
      },
      deps: [TranslocoService],
    },
    {
      provide: SettingsService<UserPreferences>,
    },
  ];
}
