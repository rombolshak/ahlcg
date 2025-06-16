import {
  ApplicationConfig,
  ErrorHandler,
  isDevMode,
  provideZonelessChangeDetection,
} from '@angular/core';
import { provideRouter } from '@angular/router';

import { routes } from './app.routes';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { BugsnagErrorHandler } from '@bugsnag/plugin-angular';
import BugsnagPerformance from '@bugsnag/browser-performance';
import Bugsnag from '@bugsnag/js';
import { provideHttpClient } from '@angular/common/http';
import { TranslocoHttpLoader } from './transloco-loader';
import { provideTransloco } from '@jsverse/transloco';

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
    provideAnimationsAsync(),
    {
      provide: ErrorHandler,
      useFactory: errorHandlerFactory,
    },
    provideTransloco({
      config: {
        availableLangs: [
          'en',
          'ru',
          'fr',
          'de',
          'it',
          'ko',
          'pl',
          'pt',
          'es',
          'uk',
          'zh',
        ],
        defaultLang: 'en',
        fallbackLang: 'en',
        // Remove this option if your application doesn't support changing language in runtime.
        reRenderOnLangChange: true,
        prodMode: !isDevMode(),
      },
      loader: TranslocoHttpLoader,
    }),
  ],
};
