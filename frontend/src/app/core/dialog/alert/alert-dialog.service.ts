import { Binding, inject, inputBinding, Service } from '@angular/core';
import { Observable } from 'rxjs';
import { DialogService } from '../dialog.service';
import { AlertDialogComponent } from './alert-dialog.component';

export interface AlertOptions {
  readonly title: string;
  readonly message: string;
  readonly okText?: string;
}

/**
 * The public API for a message-and-OK prompt — `AlertDialogComponent` is an implementation detail
 * opened through here, not instantiated directly.
 */
@Service()
export class AlertDialogService {
  private readonly dialog = inject(DialogService);

  public alert(options: AlertOptions): Observable<void> {
    const bindings: Binding[] = [inputBinding('title', () => options.title), inputBinding('message', () => options.message)];

    // Omitted rather than defaulted here: the template's own `t('ok')` fallback is the one place
    // that default lives, for the same reason `ConfirmDialogService.confirm` omits it.
    const okText = options.okText;
    if (okText !== undefined) bindings.push(inputBinding('okText', () => okText));

    return this.dialog.open(AlertDialogComponent, { bindings });
  }
}
