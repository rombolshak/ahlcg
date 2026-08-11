import { ChangeDetectionStrategy, Component, output, provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { getTranslocoModule } from '@domain/test/transloco.testing';
import { DialogService } from './dialog.service';

@Component({
  selector: 'ah-test-dialog-content',
  template: `<button type="button" (click)="result.emit('picked')">Pick</button>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
class TestDialogContentComponent {
  public readonly result = output<string>();
}

describe('DialogService', () => {
  let service: DialogService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [getTranslocoModule()],
      providers: [provideZonelessChangeDetection()],
    });
    service = TestBed.inject(DialogService);
  });

  afterEach(() => {
    document.querySelectorAll('dialog').forEach(dialog => {
      dialog.remove();
    });
  });

  it('should mount the content and show the dialog on open', () => {
    service.open(TestDialogContentComponent).subscribe();
    TestBed.tick();

    const dialog = document.querySelector('dialog');

    expect(dialog?.open).toBe(true);
    expect(document.querySelector('ah-test-dialog-content')).toBeTruthy();
  });

  it('should emit and complete when the content emits a result, then remove the host element', () => {
    const values: string[] = [];
    let completed = false;
    service.open(TestDialogContentComponent).subscribe({
      next: value => {
        values.push(value);
      },
      complete: () => {
        completed = true;
      },
    });
    TestBed.tick();

    document.querySelector('button')?.click();
    TestBed.tick();

    expect(values).toEqual(['picked']);
    expect(completed).toBe(true);
    expect(document.querySelector('ah-test-dialog-content')).toBeFalsy();
    expect(document.querySelector('dialog')).toBeFalsy();
  });

  it('should return the same stream for a second open() of the same component type while it is open', () => {
    const first = service.open(TestDialogContentComponent);
    const second = service.open(TestDialogContentComponent);
    TestBed.tick();

    expect(second).toBe(first);
    expect(document.querySelectorAll('ah-test-dialog-content').length).toBe(1);
  });

  it('should tear down and clear the map when the dialog closes without a result, so a later open() is fresh', () => {
    const values: string[] = [];
    let completed = false;
    service.open(TestDialogContentComponent).subscribe({
      next: value => {
        values.push(value);
      },
      complete: () => {
        completed = true;
      },
    });
    TestBed.tick();

    // Simulates any UA-initiated close of the native <dialog> (Escape is prevented in the
    // template, but this is the regression that matters: nothing must strand `openDialogs`).
    document.querySelector('dialog')?.dispatchEvent(new Event('close'));
    TestBed.tick();

    expect(values).toEqual([]);
    expect(completed).toBe(true);
    expect(document.querySelector('ah-test-dialog-content')).toBeFalsy();
    expect(document.querySelector('dialog')).toBeFalsy();

    let secondCompleted = false;
    service.open(TestDialogContentComponent).subscribe({
      complete: () => {
        secondCompleted = true;
      },
    });
    TestBed.tick();

    expect(document.querySelectorAll('dialog').length).toBe(1);

    document.querySelector('button')?.click();
    TestBed.tick();

    expect(secondCompleted).toBe(true);
  });

  it('should let a late subscriber receive an already-resolved result', () => {
    const stream = service.open(TestDialogContentComponent);
    TestBed.tick();

    document.querySelector('button')?.click();
    TestBed.tick();

    let late: string | undefined;
    stream.subscribe(value => {
      late = value;
    });

    expect(late).toBe('picked');
  });
});
