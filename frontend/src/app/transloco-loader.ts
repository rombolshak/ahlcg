import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import { Translation, TranslocoLoader } from '@jsverse/transloco';
import { catchError, of, throwError } from 'rxjs';

@Service()
export class TranslocoHttpLoader implements TranslocoLoader {
  private http = inject(HttpClient);

  getTranslation(lang: string) {
    // Every chrome string now lives in a scope, so a bare language — no `/` — is the root that
    // card, trait and campaign components still request from their own unscoped `*transloco`
    // blocks. There is no file to fetch for it any more.
    if (!lang.includes('/')) return of({});

    return this.http.get<Translation>(`/assets/i18n/${lang}.json`).pipe(
      catchError((error: HttpErrorResponse) => {
        if (error.status !== 404) return throwError(() => error);

        // A scope only has a file for a language somebody has translated it into, so a 404 is the
        // ordinary case, not a fault. It must not surface as a load *failure*: TranslocoService
        // reacts to one by making the successful fallback's language active for the whole app, so
        // a single missing file would switch every other scope to English too. Returning empty
        // leaves the per-key fallback — already loaded alongside — to supply the English text.
        return of<Translation>({});
      }),
    );
  }
}
