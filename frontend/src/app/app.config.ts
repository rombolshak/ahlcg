import {
  ApplicationConfig,
  ErrorHandler,
  isDevMode,
  provideZonelessChangeDetection,
} from '@angular/core';
import { provideRouter } from '@angular/router';

import { provideHttpClient } from '@angular/common/http';
import BugsnagPerformance from '@bugsnag/browser-performance';
import Bugsnag from '@bugsnag/js';
import { BugsnagErrorHandler } from '@bugsnag/plugin-angular';
import { provideTransloco } from '@jsverse/transloco';
import { routes } from 'app.routes';
import { TranslocoHttpLoader } from 'transloco-loader';

Bugsnag.start({ apiKey: 'c83772d54325525fdd6f016c4c49f3df' });
BugsnagPerformance.start({ apiKey: 'c83772d54325525fdd6f016c4c49f3df' });

function errorHandlerFactory() {
  return new BugsnagErrorHandler();
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideZonelessChangeDetection(),
    provideRouter(routes),
    provideHttpClient(),
    {
      provide: ErrorHandler,
      useFactory: errorHandlerFactory,
    },
    provideTransloco({
      config: {
        availableLangs: [
          { id: 'en', label: 'English' },
          //{ id: 'zh', label: '中文' },
          { id: 'es', label: 'Español' },
          //{ id: 'pt', label: 'Português' },
          { id: 'fr', label: 'Français' },
          { id: 'ru', label: 'Русский' },
          { id: 'de', label: 'Deutsch' },
          { id: 'it', label: 'Italiano' },
          //{ id: 'cs', label: 'Čeština' },
          //{ id: 'vi', label: 'Tiếng Việt' },
          //{ id: 'ko', label: '한국어' },
          { id: 'pl', label: 'Polski' },
          //{ id: 'uk', label: 'Українська' },
        ],
        defaultLang: 'en',
        fallbackLang: 'en',
        missingHandler: {
          useFallbackTranslation: true,
        },
        scopes: { keepCasing: true },
        // Remove this option if your application doesn't support changing language in runtime.
        reRenderOnLangChange: true,
        prodMode: !isDevMode(),
      },
      loader: TranslocoHttpLoader,
    }),
  ],
};
