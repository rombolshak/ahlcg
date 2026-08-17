import { Binding, inject, inputBinding, Service } from '@angular/core';
import { ConfirmAppearance, ConfirmButtonKey, ConfirmDialogComponent } from '@shared/components/confirm-dialog/confirm-dialog.component';
import { defaultIfEmpty, Observable } from 'rxjs';
import { DialogService } from './dialog.service';

export interface ConfirmOptions {
  readonly titleKey: string;
  readonly messageKey: string;
  readonly confirmKey?: string;
  readonly cancelKey?: string;
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
    const bindings: Binding[] = [inputBinding('messageKey', () => options.messageKey), inputBinding('appearance', () => options.appearance ?? 'primary')];

    // Omitted rather than defaulted here: `ConfirmDialogComponent`'s own `input()` default is the
    // one place that fallback lives. A binding for an `undefined` key would override it with
    // "undefined" rendered as a string, not fall through to the component's default.
    const confirmKey = options.confirmKey;
    if (confirmKey !== undefined) bindings.push(inputBinding('confirmKey', () => confirmKey));

    const cancelKey = options.cancelKey;
    if (cancelKey !== undefined) bindings.push(inputBinding('cancelKey', () => cancelKey));

    const defaultButton = options.defaultButton;
    if (defaultButton !== undefined) bindings.push(inputBinding('defaultButton', () => defaultButton));

    return this.dialog.open(ConfirmDialogComponent, { titleKey: options.titleKey, bindings }).pipe(defaultIfEmpty(false));
  }
}
