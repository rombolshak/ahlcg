import { DOCUMENT } from '@angular/common';
import { ApplicationRef, Binding, createComponent, EnvironmentInjector, inject, OutputRef, Service, Type } from '@angular/core';
import { outputToObservable } from '@angular/core/rxjs-interop';
import { TranslocoService } from '@jsverse/transloco';
import { DialogComponent, DialogSize } from '@shared/components/dialog/dialog.component';
import { DialogContent } from '@shared/components/dialog/dialog.content';
import { Observable, ReplaySubject, take } from 'rxjs';

export type DialogContentWithResult<TResult> = DialogContent & { readonly result: OutputRef<TResult> };
export interface DialogOptions {
  readonly titleKey?: string;
  readonly size?: DialogSize;
  /**
   * Forwarded to `attachContent`. Applied by change detection, which has not run by the time
   * `onOpened` fires — content must read these in `ngOnInit` or an `effect`, not `onOpened`.
   */
  readonly bindings?: Binding[];
}

/**
 * Depends only on `ApplicationRef`, `EnvironmentInjector`, `DOCUMENT` and `TranslocoService` — never
 * on `AuthService`. `AuthService`'s constructor issues a request synchronously, and the auth
 * interceptor injects this service from inside that construction; a dependency back onto
 * `AuthService` here would be a cyclic-DI error.
 */
@Service()
export class DialogService {
  private readonly appRef = inject(ApplicationRef);
  private readonly environmentInjector = inject(EnvironmentInjector);
  private readonly document = inject(DOCUMENT);
  private readonly transloco = inject(TranslocoService);

  private readonly openDialogs = new Map<Type<unknown>, Observable<unknown>>();

  public open<TResult>(content: Type<DialogContentWithResult<TResult>>, options?: DialogOptions): Observable<TResult> {
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
    if (options?.size) {
      dialogRef.setInput('size', options.size);
    }
    this.appRef.attachView(dialogRef.hostView);
    dialogRef.changeDetectorRef.detectChanges();

    const contentRef = dialogRef.instance.attachContent(content, options?.bindings);

    const result$ = new ReplaySubject<TResult>(1);

    // Two independent paths lead here: the content emits a result, or the dialog closes some
    // other way (Escape is prevented in the template, but nothing should be able to strand
    // `openDialogs` if a future content type calls `close()` itself).
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

    // Opened last, and deliberately: `open()` runs the content's `onOpened`, where content that
    // already knows its answer can emit `result` synchronously. Everything that has to survive
    // that — the subject, both subscriptions, the map entry — must already be in place, or the
    // value is emitted into the void and the entry is registered after its own teardown deleted
    // it, leaving a resolved dialog permanently marked as open.
    dialogRef.instance.open();

    return result$;
  }
}
