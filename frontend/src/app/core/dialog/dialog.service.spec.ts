import { ChangeDetectionStrategy, Component, output, provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { InputManagerService } from '@core/input-manager.service';
import { getTranslocoModule } from '@testing/transloco.testing';
import { vi } from 'vitest';
import { DialogService } from './dialog.service';

@Component({
  selector: 'ah-test-dialog-content',
  template: `<button type="button" (click)="result.emit('picked')">Pick</button>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
class TestDialogContentComponent {
  public readonly result = output<string>();
}

/** Content that already knows its answer, so it resolves inside `onOpened` — before `open()` returns. */
@Component({
  selector: 'ah-test-immediate-dialog-content',
  template: ``,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
class ImmediateDialogContentComponent {
  public readonly result = output<string>();

  public onOpened() {
    this.result.emit('immediate');
  }
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

  it('should deliver a result emitted synchronously from onOpened', () => {
    const values: string[] = [];
    let completed = false;
    service.open(ImmediateDialogContentComponent).subscribe({
      next: value => {
        values.push(value);
      },
      complete: () => {
        completed = true;
      },
    });

    // No tick: `open()` must have wired the subject and both subscriptions before it opened the
    // dialog, so a result emitted from `onOpened` lands rather than being emitted into the void.
    expect(values).toEqual(['immediate']);
    expect(completed).toBe(true);
    expect(document.querySelector('dialog')).toBeFalsy();
  });

  it('should not leave a dialog resolved from onOpened registered as open', () => {
    service.open(ImmediateDialogContentComponent).subscribe();
    TestBed.tick();

    // The map entry is written before `open()`, so its own teardown has to be the thing that
    // clears it. If the write landed afterwards, this second call would hand back the dead
    // stream from the first and never show a dialog again.
    let secondValue: string | undefined;
    service.open(ImmediateDialogContentComponent).subscribe(value => {
      secondValue = value;
    });

    expect(secondValue).toBe('immediate');
    expect(document.querySelector('dialog')).toBeFalsy();
  });

  it('should not strand an input layer for a dialog resolved from onOpened', () => {
    const inputManager = TestBed.inject(InputManagerService);
    service.open(ImmediateDialogContentComponent).subscribe();
    TestBed.tick();

    const globalCancel = vi.fn();
    inputManager.registerGlobal({ cancel: globalCancel });
    document.dispatchEvent(new KeyboardEvent('keydown', { code: 'Escape' }));

    // A layer pushed after teardown sits on top of the stack forever, and `cancel` on it closes
    // an already-destroyed dialog. Reaching the global layer proves nothing was left behind.
    expect(globalCancel).toHaveBeenCalledTimes(1);
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
