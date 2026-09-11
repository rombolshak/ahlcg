import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { InputLayer } from '@core/input-manager.service';
import { TranslocoDirective } from '@jsverse/transloco';
import { AH_DIALOG_CONTENT } from '../dialog-content';
import { DialogContentWithResult } from '../dialog.service';

/**
 * A reusable message-and-OK prompt, opened through `AlertDialogService` rather than instantiated
 * directly. `ConfirmDialogComponent`'s two-button design assumes two buttons throughout — this is
 * the one-button sibling for a caller that just needs to report something and get acknowledged.
 */
@Component({
  selector: 'ah-alert-dialog',
  imports: [TranslocoDirective],
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
  public readonly messageKey = input.required<string>();
  public readonly okKey = input('alert_dialog.ok');

  public readonly result = output();

  public getInputHandlers: () => InputLayer = () => ({
    confirm: () => {
      this.result.emit();
    },
    cancel: () => {
      this.result.emit();
    },
  });
}
