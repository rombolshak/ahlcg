import { HttpContextToken, HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, switchMap, throwError, throwIfEmpty } from 'rxjs';
import { SIGN_IN_PROMPT } from './sign-in-prompt';

const RETRIED = new HttpContextToken(() => false);

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  // Safe to inject here even though `AuthService`'s constructor issues `GET /auth/info`
  // synchronously and this interceptor body runs during that construction: whatever is bound to
  // `SIGN_IN_PROMPT` must not depend on `AuthService` (see the token's doc comment), so there is
  // no cyclic-DI error.
  const signInPrompt = inject(SIGN_IN_PROMPT);

  return next(req).pipe(
    catchError((error: unknown) => {
      const isAuthInfoRequest = req.method === 'GET' && req.url.endsWith('/auth/info');
      if (!(error instanceof HttpErrorResponse) || error.status !== 401 || isAuthInfoRequest || req.context.get(RETRIED)) {
        return throwError(() => error);
      }

      return signInPrompt.prompt().pipe(
        switchMap(() => next(req.clone({ context: req.context.set(RETRIED, true) }))),
        // Dismissed without signing in: the dialog stream completes without emitting, so
        // switchMap's projection never runs and this pipe would otherwise complete silently
        // instead of failing — surface the original 401 rather than hang the caller.
        throwIfEmpty(() => error),
      );
    }),
  );
};
