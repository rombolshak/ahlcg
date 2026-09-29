import { HttpErrorResponse } from '@angular/common/http';
import { ValidationError } from '@angular/forms/signals';

export function toJoinError(err: unknown): ValidationError | undefined {
  if (err instanceof HttpErrorResponse) {
    if (err.status === 404) return { kind: 'rejected' };
    if (err.status === 429) return { kind: 'too_many_attempts' };
    if (err.status === 401) return undefined;
  }

  return { kind: 'generic' };
}
