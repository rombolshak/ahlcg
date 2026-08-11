import { DOCUMENT } from '@angular/common';
import { ApplicationRef, createComponent, EnvironmentInjector, inject, Injectable, OutputRef, Type } from '@angular/core';
import { outputToObservable } from '@angular/core/rxjs-interop';
import { TranslocoService } from '@jsverse/transloco';
import { DialogComponent } from '@shared/components/dialog/dialog.component';
import { DialogContent } from '@shared/components/dialog/dialog.content';
import { Observable, ReplaySubject, take } from 'rxjs';

export type DialogContentWithResult<TResult> = DialogContent & { readonly result: OutputRef<TResult> };

/**
 * Depends only on `ApplicationRef`, `EnvironmentInjector`, `DOCUMENT` and `TranslocoService` — never
 * on `AuthService`. `AuthService`'s constructor issues a request synchronously, and the auth
 * interceptor injects this service from inside that construction; a dependency back onto
 * `AuthService` here would be a cyclic-DI error.
 */
@Injectable({
  providedIn: 'root',
})
export class DialogService {
  private readonly appRef = inject(ApplicationRef);
  private readonly environmentInjector = inject(EnvironmentInjector);
  private readonly document = inject(DOCUMENT);
  private readonly transloco = inject(TranslocoService);

  private readonly openDialogs = new Map<Type<unknown>, Observable<unknown>>();

  public open<TResult>(content: Type<DialogContentWithResult<TResult>>, options?: { titleKey?: string }): Observable<TResult> {
    const existing = this.openDialogs.get(content);
    if (existing) return existing as Observable<TResult>;

    const host = this.document.createElement('div');
    this.document.body.appendChild(host);

    const dialogRef = createComponent(DialogComponent, {
      environmentInjector: this.environmentInjector,
      hostElement: host,
    });
    if (options?.titleKey) {
      dialogRef.setInput('title', this.transloco.translate(options.titleKey));
    }
    this.appRef.attachView(dialogRef.hostView);
    dialogRef.changeDetectorRef.detectChanges();

    const contentRef = dialogRef.instance.attachContent(content);
    dialogRef.instance.open();

    const result$ = new ReplaySubject<TResult>(1);

    // Two independent paths lead here: the content emits a result, or the dialog closes some
    // other way (nothing does today, since content-provided `cancel` handlers never call
    // `close()` directly — but nothing should be able to strand `openDialogs` if that changes).
    // `teardown` calling `dialogRef.instance.close()` itself fires the native `close` event,
    // re-entering this function — `done` makes it idempotent.
    let done = false;
    const teardown = () => {
      if (done) return;
      done = true;

      dialogRef.instance.close();
      this.appRef.detachView(dialogRef.hostView);
      dialogRef.destroy();
      host.remove();
      this.openDialogs.delete(content);
    };

    outputToObservable(contentRef.instance.result)
      .pipe(take(1))
      .subscribe(value => {
        // Deliver the value before tearing down: `teardown` closes the dialog, which
        // synchronously fires the native `close` event and re-enters via the `closed`
        // subscription below — that path must find `result$` already carrying its value.
        result$.next(value);
        result$.complete();
        teardown();
      });

    outputToObservable(dialogRef.instance.closed)
      .pipe(take(1))
      .subscribe(() => {
        teardown();
        result$.complete();
      });

    this.openDialogs.set(content, result$);
    return result$;
  }
}
