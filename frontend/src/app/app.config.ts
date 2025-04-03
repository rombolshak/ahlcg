import {
  ApplicationConfig,
  ErrorHandler,
  provideExperimentalZonelessChangeDetection,
} from '@angular/core';
import { provideRouter } from '@angular/router';

import { routes } from './app.routes';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { BugsnagErrorHandler } from '@bugsnag/plugin-angular';
import BugsnagPerformance from '@bugsnag/browser-performance';
import Bugsnag from '@bugsnag/js';
import { provideHttpClient } from '@angular/common/http';

Bugsnag.start({ apiKey: 'c83772d54325525fdd6f016c4c49f3df' });
BugsnagPerformance.start({ apiKey: 'c83772d54325525fdd6f016c4c49f3df' });

function errorHandlerFactory() {
  return new BugsnagErrorHandler();
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideExperimentalZonelessChangeDetection(),
    provideRouter(routes),
    provideHttpClient(),
    provideAnimationsAsync(),
    {
      provide: ErrorHandler,
      useFactory: errorHandlerFactory,
    },
  ],
};
