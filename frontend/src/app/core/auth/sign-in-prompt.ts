import { InjectionToken } from '@angular/core';
import { Observable } from 'rxjs';
import { User } from './auth.service';

/**
 * Asks the user to sign in, however that is implemented, and resolves once they have. The auth
 * interceptor is the only consumer that matters here: it depends on this token instead of a
 * component so `core/` never imports `features/`.
 *
 * Completing without emitting is a meaningful outcome, not an oversight — it means the user
 * dismissed the prompt without signing in. The interceptor's `throwIfEmpty` depends on that empty
 * completion to surface the original 401 instead of hanging the caller; do not "fix" this into an
 * error or a `null` emission.
 */
export interface SignInPrompt {
  prompt(): Observable<User>;
}

/**
 * Whatever is bound to this token must not depend on `AuthService`, directly or transitively.
 * `AuthService`'s constructor issues `GET /auth/info` synchronously, and the auth interceptor
 * injects this token from inside that construction — a dependency back onto `AuthService` here
 * would be a cyclic-DI error at runtime.
 */
export const SIGN_IN_PROMPT = new InjectionToken<SignInPrompt>('SIGN_IN_PROMPT');
