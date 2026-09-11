import { Binding, inject, inputBinding, Service } from '@angular/core';
import { Observable } from 'rxjs';
import { DialogService } from '../dialog.service';
import { AlertDialogComponent } from './alert-dialog.component';

export interface AlertOptions {
  readonly titleKey: string;
  readonly messageKey: string;
  readonly okKey?: string;
}

/**
 * The public API for a message-and-OK prompt — `AlertDialogComponent` is an implementation detail
 * opened through here, not instantiated directly.
 */
@Service()
export class AlertDialogService {
  private readonly dialog = inject(DialogService);

  public alert(options: AlertOptions): Observable<void> {
    const bindings: Binding[] = [inputBinding('messageKey', () => options.messageKey)];

    // Omitted rather than defaulted here: `AlertDialogComponent`'s own `input()` default is the
    // one place that fallback lives, for the same reason `ConfirmDialogService.confirm` omits it.
    const okKey = options.okKey;
    if (okKey !== undefined) bindings.push(inputBinding('okKey', () => okKey));

    return this.dialog.open(AlertDialogComponent, { titleKey: options.titleKey, bindings });
  }
}
