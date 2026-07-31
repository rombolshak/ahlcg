import { InjectionToken } from '@angular/core';
import { InputLayer } from '@services/input-manager.service';

export interface DialogContent {
  onOpened?: () => void;
  onClosed?: () => void;

  getInputHandlers?: () => InputLayer;
}
export const AH_DIALOG_CONTENT = new InjectionToken<DialogContent>('AH_DIALOG_CONTENT');
