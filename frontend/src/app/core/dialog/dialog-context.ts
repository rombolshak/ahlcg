import { InjectionToken } from '@angular/core';

export interface DialogContext {
  close: () => void;
}

export const AH_DIALOG_CONTEXT = new InjectionToken<DialogContext>('AH_DIALOG_CONTEXT');
