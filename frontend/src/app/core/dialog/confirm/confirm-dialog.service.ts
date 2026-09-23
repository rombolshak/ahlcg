import { Binding, inject, inputBinding, Service } from '@angular/core';
import { defaultIfEmpty, Observable } from 'rxjs';
import { DialogService } from '../dialog.service';
import { ConfirmAppearance, ConfirmButtonKey, ConfirmDialogComponent } from './confirm-dialog.component';

export interface ConfirmOptions {
  readonly title: string;
  readonly message: string;
  readonly confirmText?: string;
  readonly cancelText?: string;
  readonly appearance?: ConfirmAppearance;
  /** Which button opens selected. Defaults to confirm; a destructive prompt should ask for cancel. */
  readonly defaultButton?: ConfirmButtonKey;
}

/**
 * The public API for a confirm/cancel prompt — `ConfirmDialogComponent` is an implementation
 * detail opened through here, not instantiated directly. `confirm()` always yields a decision:
 * a dialog dismissed some other way still resolves `false`, so a caller piping into an action
 * never hangs.
 */
@Service()
export class ConfirmDialogService {
  private readonly dialog = inject(DialogService);

  public confirm(options: ConfirmOptions): Observable<boolean> {
    const bindings: Binding[] = [
      inputBinding('title', () => options.title),
      inputBinding('message', () => options.message),
      inputBinding('appearance', () => options.appearance ?? 'primary'),
    ];

    // Omitted rather than defaulted here: the template's own `t('confirm')`/`t('cancel')` fallback
    // is the one place that default lives. A binding for an `undefined` value would override it
    // with "undefined" rendered as a string, not fall through to the template's default.
    const confirmText = options.confirmText;
    if (confirmText !== undefined) bindings.push(inputBinding('confirmText', () => confirmText));

    const cancelText = options.cancelText;
    if (cancelText !== undefined) bindings.push(inputBinding('cancelText', () => cancelText));

    const defaultButton = options.defaultButton;
    if (defaultButton !== undefined) bindings.push(inputBinding('defaultButton', () => defaultButton));

    return this.dialog.open(ConfirmDialogComponent, { bindings }).pipe(defaultIfEmpty(false));
  }
}
