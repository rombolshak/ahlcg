import { ChangeDetectionStrategy, Component, computed, input, OnInit, output, signal } from '@angular/core';
import { DialogContentWithResult } from '@core/dialog.service';
import { InputLayer } from '@core/input-manager.service';
import { listNavigation } from '@core/list-navigation';
import { TranslocoDirective } from '@jsverse/transloco';
import { AH_DIALOG_CONTENT } from '@ui/components/dialog/dialog.content';

export type ConfirmAppearance = 'primary' | 'error';
export type ConfirmButtonKey = 'confirm' | 'cancel';

interface ConfirmButton {
  key: ConfirmButtonKey;
  value: boolean;
}

/**
 * Colour carries meaning, emphasis carries selection: each button keeps its own hue in both states
 * and goes from `btn-soft` to solid when selected. Selection cannot be primary-vs-default here, as
 * it is for a row of equal actions — that would leave cancel wearing the confirm colour when
 * selected, and confirm dropping its danger colour when it is not.
 *
 * Cancel is `accent` (a hue-neutral grey at 43% lightness) rather than `neutral`, which sits at 30%
 * against a 20% base and is what made the previous `btn-active` highlight invisible.
 *
 * The whole class list per state, not just the differing part — Tailwind only emits classes spelled
 * out in source, as `SIZE_CLASSES` notes in `dialog.component.ts`.
 */
const CONFIRM_BUTTON_CLASSES: Record<ConfirmAppearance, { selected: string; unselected: string }> = {
  primary: { selected: 'btn btn-primary', unselected: 'btn btn-soft btn-primary' },
  error: { selected: 'btn btn-error', unselected: 'btn btn-soft btn-error' },
};

const CANCEL_BUTTON_CLASSES = { selected: 'btn btn-accent', unselected: 'btn btn-soft btn-accent' } as const;

/**
 * A reusable confirm/cancel prompt, opened through `ConfirmDialogService` rather than instantiated
 * directly — that service is the public API and always yields a decision, including when the
 * dialog is dismissed without one. Sign-out-while-anonymous is its first caller.
 */
@Component({
  selector: 'ah-confirm-dialog',
  imports: [TranslocoDirective],
  templateUrl: './confirm-dialog.component.html',
  providers: [
    {
      provide: AH_DIALOG_CONTENT,
      useExisting: ConfirmDialogComponent,
    },
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConfirmDialogComponent implements DialogContentWithResult<boolean>, OnInit {
  public readonly messageKey = input.required<string>();
  public readonly confirmKey = input('confirm_dialog.confirm');
  public readonly cancelKey = input('confirm_dialog.cancel');
  public readonly appearance = input<ConfirmAppearance>('primary');

  /**
   * Which button is selected when the dialog opens. Confirm is the usual answer — the caller is
   * asking because it expects a yes — so a destructive prompt has to ask for `'cancel'` rather than
   * getting it implicitly from `appearance`: the two are independent, and a red confirm button is
   * not by itself a reason to move the selection.
   */
  public readonly defaultButton = input<ConfirmButtonKey>('confirm');

  public readonly result = output<boolean>();

  private readonly buttons = signal<ConfirmButton[]>([
    { key: 'confirm', value: true },
    { key: 'cancel', value: false },
  ]);

  private readonly navigation = listNavigation({
    items: this.buttons,
    onConfirm: button => {
      this.result.emit(button.value);
    },
    orientation: 'horizontal',
  });
  protected readonly selectedIndex = this.navigation.selectedIndex;

  protected readonly confirmButtonClass = computed(() => {
    const classes = CONFIRM_BUTTON_CLASSES[this.appearance()];
    return this.selectedIndex() === 0 ? classes.selected : classes.unselected;
  });
  protected readonly cancelButtonClass = computed(() => (this.selectedIndex() === 1 ? CANCEL_BUTTON_CLASSES.selected : CANCEL_BUTTON_CLASSES.unselected));

  /**
   * Not `onOpened`: that fires before this component's first change detection, so `defaultButton`
   * would still read as its declared default and a caller asking for cancel would be ignored.
   * Inputs are applied by the time `ngOnInit` runs.
   */
  public ngOnInit(): void {
    const index = this.buttons().findIndex(button => button.key === this.defaultButton());
    this.selectedIndex.set(index === -1 ? 0 : index);
  }

  public getInputHandlers: () => InputLayer = () => ({
    ...this.navigation.handlers,
    cancel: () => {
      this.result.emit(false);
    },
  });
}
