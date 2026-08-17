import { InjectionToken } from '@angular/core';
import { InputLayer } from '@services/input-manager.service';

export interface DialogContent {
  /**
   * Fires when the dialog opens — **before** the content's first change detection, so its inputs
   * are not applied yet: anything passed through `DialogOptions.bindings` still reads as its
   * declared default here. Initialize from inputs in `ngOnInit` or an `effect` instead.
   *
   * What this hook is for is content that outlives a single open — projected content is created
   * once and reopened many times, so per-open state (a view swap, a selection) has to be reset
   * somewhere `ngOnInit` will not run again.
   */
  onOpened?: () => void;
  onClosed?: () => void;

  getInputHandlers?: () => InputLayer;

  /**
   * The heading this content wants, or `undefined` to leave the dialog's own `title` input alone.
   * Read reactively, on the same principle as `getInputHandlers`: content that swaps views renames
   * the dialog by returning a different value, rather than pushing a title into it.
   */
  getTitle?: () => string | undefined;
}
export const AH_DIALOG_CONTENT = new InjectionToken<DialogContent>('AH_DIALOG_CONTENT');
