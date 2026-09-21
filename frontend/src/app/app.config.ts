import { ApplicationConfig, ErrorHandler, isDevMode, provideZonelessChangeDetection } from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';

import { provideHttpClient, withInterceptors } from '@angular/common/http';
import BugsnagPerformance from '@bugsnag/browser-performance';
import Bugsnag from '@bugsnag/js';
import { BugsnagErrorHandler } from '@bugsnag/plugin-angular';
import { authInterceptor } from '@core/auth/auth.interceptor';
import { resolveAvailableLangs } from '@core/i18n/resolve-available-langs';
import { storageKeyFor } from '@core/settings/settings.service';
import { provideSignInPrompt } from '@features/auth/sign-in/sign-in.provider';
import { USER_PREFERENCES_SUFFIX } from '@features/settings/user-preferences.service';
import { provideTransloco } from '@jsverse/transloco';
import { routes } from './app.routes';
import { availableLangs as langCoverage } from './generated/available-langs';
import { TranslocoHttpLoader } from './transloco-loader';

Bugsnag.start({ apiKey: 'c83772d54325525fdd6f016c4c49f3df' });
BugsnagPerformance.start({ apiKey: 'c83772d54325525fdd6f016c4c49f3df' });

function errorHandlerFactory() {
  return new BugsnagErrorHandler();
}

const LANG_COVERAGE_THRESHOLD = 90;

function isPersistedLang(value: unknown): value is { lang: string } {
  return typeof value === 'object' && value !== null && 'lang' in value && typeof value.lang === 'string';
}

function storedLang(): string | undefined {
  try {
    const stored = localStorage.getItem(storageKeyFor(USER_PREFERENCES_SUFFIX));
    const parsed: unknown = stored ? JSON.parse(stored) : undefined;
    return isPersistedLang(parsed) ? parsed.lang : undefined;
  } catch {
    return undefined;
  }
}

const explicitLangIds = [new URLSearchParams(location.search).get('lang') ?? undefined, storedLang()].filter((id): id is string => id !== undefined);

export const appConfig: ApplicationConfig = {
  providers: [
    provideZonelessChangeDetection(),
    provideRouter(routes, withComponentInputBinding()),
    provideHttpClient(withInterceptors([authInterceptor])),
    provideSignInPrompt(),
    {
      provide: ErrorHandler,
      useFactory: errorHandlerFactory,
    },
    provideTransloco({
      config: {
        availableLangs: resolveAvailableLangs(langCoverage, LANG_COVERAGE_THRESHOLD, explicitLangIds),
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
