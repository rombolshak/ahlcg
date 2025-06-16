import { Provider } from '@angular/core';
import {
  DEFAULT_SETTINGS,
  SettingsService,
  STORAGE_KEY_SUFFIX,
} from './settings.service';
import { type } from 'arktype';

const userPreferences = type({
  lang: 'string',
});

export type UserPreferences = typeof userPreferences.infer;

export function provideUserPreferencesService(): Provider {
  return [
    { provide: STORAGE_KEY_SUFFIX, useValue: 'user-preferences' },
    {
      provide: DEFAULT_SETTINGS,
      useValue: userPreferences.assert({
        lang: 'fr',
      }),
    },
    {
      provide: SettingsService<UserPreferences>,
    },
  ];
}
