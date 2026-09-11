import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { getTranslocoModule } from '@testing/transloco.testing';
import { AlertDialogService } from './alert-dialog.service';

describe('AlertDialogService', () => {
  let service: AlertDialogService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [getTranslocoModule()],
      providers: [provideZonelessChangeDetection()],
    });
    service = TestBed.inject(AlertDialogService);
  });

  afterEach(() => {
    document.querySelectorAll('dialog').forEach(dialog => {
      dialog.remove();
    });
  });

  it('should show the given title and message and resolve when acknowledged', () => {
    let resolved = false;
    service.alert({ titleKey: 'main_menu.new_game_error.title', messageKey: 'main_menu.new_game_error.message' }).subscribe(() => {
      resolved = true;
    });
    TestBed.tick();

    expect(document.querySelector('h1')?.textContent).toContain('The case remains closed');
    expect(document.querySelector('p')?.textContent).toContain('The investigation could not be started');

    document.querySelector<HTMLElement>('[data-testId=ok]')?.click();
    TestBed.tick();

    expect(resolved).toBe(true);
  });
});
