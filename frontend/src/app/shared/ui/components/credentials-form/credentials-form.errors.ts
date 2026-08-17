import { HttpErrorResponse } from '@angular/common/http';
import { ValidationError } from '@angular/forms/signals';

interface IdentityError {
  code?: string;
  description?: string;
}

interface IdentityResult {
  succeeded: boolean;
  errors: IdentityError[];
}

/**
 * Adapts `AuthService.signIn()`'s failure modes to a form-level `ValidationError`, so the
 * submission `action` can hand it straight back to the field tree. The two paths the alert has
 * always had survive unchanged: a translated key for a known status, or the server's own text
 * for a `400`. `kind` alone (no `message`) means "translate `errors.<kind>`" — the template reads
 * it that way.
 */
export function toValidationError(err: unknown): ValidationError {
  if (err instanceof HttpErrorResponse) {
    if (err.status === 403) return { kind: 'wrong_password' };

    if (err.status === 400) {
      const body = err.error as IdentityResult | null;
      const descriptions = (body?.errors ?? []).map(e => e.description).filter((d): d is string => Boolean(d));
      if (descriptions.length > 0) return { kind: 'server', message: descriptions.join(' ') };
    }
  }

  return { kind: 'generic' };
}
