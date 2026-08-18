import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { getTranslocoModule } from '@testing/transloco.testing';
import { ConfirmDialogService } from './confirm-dialog.service';

describe('ConfirmDialogService', () => {
  let service: ConfirmDialogService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [getTranslocoModule()],
      providers: [provideZonelessChangeDetection()],
    });
    service = TestBed.inject(ConfirmDialogService);
  });

  afterEach(() => {
    document.querySelectorAll('dialog').forEach(dialog => {
      dialog.remove();
    });
  });

  it('should resolve true when confirmed', () => {
    let result: boolean | undefined;
    service.confirm({ titleKey: 'settings.account.sign_out_warning.title', messageKey: 'settings.account.sign_out_warning.message' }).subscribe(value => {
      result = value;
    });
    TestBed.tick();

    document.querySelector<HTMLElement>('[data-testId=confirm]')?.click();
    TestBed.tick();

    expect(result).toBe(true);
  });

  it('should resolve false when cancelled', () => {
    let result: boolean | undefined;
    service.confirm({ titleKey: 'settings.account.sign_out_warning.title', messageKey: 'settings.account.sign_out_warning.message' }).subscribe(value => {
      result = value;
    });
    TestBed.tick();

    document.querySelector<HTMLElement>('[data-testId=cancel]')?.click();
    TestBed.tick();

    expect(result).toBe(false);
  });

  // The one behaviour that makes `confirm()` safe to pipe into an action without hanging: a
  // dialog closed by any other route — not just its own Cancel button — still answers.
  it('should resolve false when the dialog is dismissed without a decision', () => {
    let result: boolean | undefined;
    service.confirm({ titleKey: 'settings.account.sign_out_warning.title', messageKey: 'settings.account.sign_out_warning.message' }).subscribe(value => {
      result = value;
    });
    TestBed.tick();

    document.querySelector('dialog')?.dispatchEvent(new Event('close'));
    TestBed.tick();

    expect(result).toBe(false);
  });
});
