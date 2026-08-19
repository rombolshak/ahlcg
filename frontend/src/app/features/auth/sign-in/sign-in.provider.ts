import { inject, Provider } from '@angular/core';
import { SIGN_IN_PROMPT, SignInPrompt } from '@core/auth/sign-in-prompt';
import { DialogService } from '@core/dialog/dialog.service';
import { from, switchMap } from 'rxjs';

/**
 * Binds `SIGN_IN_PROMPT` to the real dialog. `SignInComponent` is behind a dynamic `import()`
 * rather than a static one so the sign-in feature — and its whole tree, `CredentialsFormComponent`
 * included — leaves the initial bundle; the auth interceptor is wired into `provideHttpClient` in
 * `app.config.ts`, so a static import here would ship on every first paint regardless of whether
 * the user ever signs in.
 *
 * The factory injects `DialogService` and nothing else: this token resolves while injected from
 * inside the auth interceptor, which itself runs during `AuthService`'s synchronous constructor
 * request, so anything reachable from here must not depend on `AuthService` (see
 * `core/dialog/dialog.service.ts`'s doc comment).
 */
export function provideSignInPrompt(): Provider {
  return {
    provide: SIGN_IN_PROMPT,
    useFactory: (): SignInPrompt => {
      const dialog = inject(DialogService);

      return {
        prompt: () => from(import('./sign-in.component')).pipe(switchMap(m => dialog.open(m.SignInComponent, m.SIGN_IN_DIALOG_OPTIONS))),
      };
    },
  };
}
