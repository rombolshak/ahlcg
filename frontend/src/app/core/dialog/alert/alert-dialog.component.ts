import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { ScopedTranslocoDirective } from '@core/i18n/scoped-transloco.directive';
import { InputLayer } from '@core/input-manager.service';
import { AH_DIALOG_CONTENT } from '../dialog-content';
import { DialogContentWithResult } from '../dialog.service';
import { I18N_SCOPE } from './i18n/scope';

/**
 * A reusable message-and-OK prompt, opened through `AlertDialogService` rather than instantiated
 * directly. `ConfirmDialogComponent`'s two-button design assumes two buttons throughout — this is
 * the one-button sibling for a caller that just needs to report something and get acknowledged.
 */
@Component({
  selector: 'ah-alert-dialog',
  imports: [ScopedTranslocoDirective],
  templateUrl: './alert-dialog.component.html',
  providers: [
    {
      provide: AH_DIALOG_CONTENT,
      useExisting: AlertDialogComponent,
    },
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AlertDialogComponent implements DialogContentWithResult<void> {
  protected readonly scope = I18N_SCOPE;

  /**
   * Not `.required()`: `DialogComponent.displayedTitle` reads `getTitle()` reactively as soon as
   * `attachContent` sets the content signal, which can happen before `DialogService`'s `Binding[]`
   * are applied by this component's own first change detection — a required input would throw
   * `NG0950` at that moment instead of just reading as `undefined` for one frame.
   */
  public readonly title = input<string>();
  public readonly message = input.required<string>();
  public readonly okText = input<string>();

  public readonly result = output();

  public getTitle = () => this.title();

  public getInputHandlers: () => InputLayer = () => ({
    confirm: () => {
      this.result.emit();
    },
    cancel: () => {
      this.result.emit();
    },
  });
}
