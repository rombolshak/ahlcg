import { HttpContextToken, HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { SignInComponent } from '@shared/components/sign-in/sign-in.component';
import { catchError, switchMap, throwError, throwIfEmpty } from 'rxjs';
import { DialogService } from './dialog.service';

const RETRIED = new HttpContextToken(() => false);

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  // Safe to inject here even though `AuthService`'s constructor issues `GET /auth/info`
  // synchronously and this interceptor body runs during that construction: `DialogService`
  // depends only on `ApplicationRef`, `EnvironmentInjector`, `DOCUMENT` and `TranslocoService`,
  // never on `AuthService`, so there is no cyclic-DI error.
  const dialog = inject(DialogService);

  return next(req).pipe(
    catchError((error: unknown) => {
      const isAuthInfoRequest = req.method === 'GET' && req.url.endsWith('/auth/info');
      if (!(error instanceof HttpErrorResponse) || error.status !== 401 || isAuthInfoRequest || req.context.get(RETRIED)) {
        return throwError(() => error);
      }

      return dialog.open(SignInComponent, { titleKey: 'auth.sign_in.title' }).pipe(
        switchMap(() => next(req.clone({ context: req.context.set(RETRIED, true) }))),
        // Dismissed without signing in: the dialog stream completes without emitting, so
        // switchMap's projection never runs and this pipe would otherwise complete silently
        // instead of failing — surface the original 401 rather than hang the caller.
        throwIfEmpty(() => error),
      );
    }),
  );
};
