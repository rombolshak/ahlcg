import { HttpErrorResponse } from '@angular/common/http';
import { ValidationError } from '@angular/forms/signals';

/**
 * Adapts `GamesService.join()`'s failure modes to a form-level `ValidationError`. Unknown,
 * malformed and expired codes are already indistinguishable server-side (a uniform 404), so this
 * never invents a more specific message than the endpoint gives. A 401 is not a failure to report:
 * it means the caller dismissed the sign-in prompt `authInterceptor` opened, the same case
 * `MainMenuComponent.newGame()` already treats as quiet — the dialog just stays open.
 */
export function toJoinError(err: unknown): ValidationError | undefined {
  if (err instanceof HttpErrorResponse) {
    if (err.status === 404) return { kind: 'rejected' };
    if (err.status === 429) return { kind: 'too_many_attempts' };
    if (err.status === 401) return undefined;
  }

  return { kind: 'generic' };
}
