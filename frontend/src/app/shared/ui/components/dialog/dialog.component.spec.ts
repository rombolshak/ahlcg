import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ChangeDetectionStrategy, Component, provideZonelessChangeDetection, viewChild } from '@angular/core';
import { By } from '@angular/platform-browser';
import { InputLayer, InputManagerService } from '@services/input-manager.service';
import { MockInstance, vi } from 'vitest';
import { DialogComponent } from './dialog.component';
import { AH_DIALOG_CONTENT, DialogContent } from './dialog.content';

@Component({
  selector: 'ah-test-content',
  template: '',
  providers: [
    {
      provide: AH_DIALOG_CONTENT,
      useExisting: TestContentComponent,
    },
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
class TestContentComponent implements DialogContent {
  public opened = false;

  public onOpened = () => {
    this.opened = true;
  };

  public getInputHandlers = () => ({
    confirm: () => {
      /* noop */
    },
  });
}

@Component({
  selector: 'ah-test-host',
  imports: [DialogComponent, TestContentComponent],
  template: `<ah-dialog><ah-test-content /></ah-dialog>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
class TestHostComponent {
  public readonly dialog = viewChild.required(DialogComponent);
}

/** The dialog pushes a provider, so the layer it registered has to be called to be inspected. */
const resolveLayer = (pushSpy: MockInstance<InputManagerService['pushLayer']>): InputLayer => {
  const layer = pushSpy.mock.calls[0]?.[0];
  return typeof layer === 'function' ? layer() : (layer ?? {});
};

describe('DialogComponent', () => {
  let component: DialogComponent;
  let fixture: ComponentFixture<DialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DialogComponent],
      providers: [provideZonelessChangeDetection()],
    }).compileComponents();

    fixture = TestBed.createComponent(DialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should instantiate attached content into the container and pick up its input handlers on open', () => {
    const contentRef = component.attachContent(TestContentComponent);
    fixture.detectChanges();

    const inputManager = TestBed.inject(InputManagerService);
    const pushSpy = vi.spyOn(inputManager, 'pushLayer');

    component.open();

    expect(contentRef.instance.opened).toBe(true);
    expect(pushSpy).toHaveBeenCalledTimes(1);
    expect(typeof resolveLayer(pushSpy).confirm).toBe('function');
  });

  it('should re-ask the content for its handlers on every command rather than snapshotting them at open', async () => {
    const contentRef = component.attachContent(TestContentComponent);
    fixture.detectChanges();

    const inputManager = TestBed.inject(InputManagerService);
    const pushSpy = vi.spyOn(inputManager, 'pushLayer');

    component.open();

    const swapped = vi.fn();
    contentRef.instance.getInputHandlers = () => ({ confirm: swapped });
    await resolveLayer(pushSpy).confirm?.();

    expect(swapped).toHaveBeenCalledTimes(1);
  });

  it('should not push an input layer when onOpened closes the dialog synchronously', () => {
    const contentRef = component.attachContent(TestContentComponent);
    contentRef.instance.onOpened = () => {
      component.close();
    };
    fixture.detectChanges();

    const inputManager = TestBed.inject(InputManagerService);
    const pushSpy = vi.spyOn(inputManager, 'pushLayer');

    component.open();

    // A layer pushed here would outlive the dialog: `close()` has already run and destroyed the
    // layer that existed at the time, which was none, so nothing would ever pop this one.
    expect(pushSpy).not.toHaveBeenCalled();
  });

  it('should size the modal box small by default', () => {
    const box = fixture.debugElement.query(By.css('.modal-box')).nativeElement as HTMLElement;

    expect(box.classList.contains('max-w-[32rem]')).toBe(true);
  });

  for (const [size, widthClass] of [
    ['m', 'max-w-[48rem]'],
    ['l', 'max-w-[64rem]'],
  ] as const) {
    it(`should widen the modal box for size ${size}`, () => {
      fixture.componentRef.setInput('size', size);
      fixture.detectChanges();

      const box = fixture.debugElement.query(By.css('.modal-box')).nativeElement as HTMLElement;

      // The binding carries the whole class list, so `modal-box` itself has to survive the swap.
      expect(box.classList.contains(widthClass)).toBe(true);
      expect(box.classList.contains('max-w-[32rem]')).toBe(false);
      expect(box.classList.contains('modal-box')).toBe(true);
    });
  }

  it('should prevent the native cancel event so Escape cannot close the dialog on its own', () => {
    const dialogEl = fixture.debugElement.query(By.css('dialog')).nativeElement as HTMLDialogElement;
    const event = new Event('cancel', { cancelable: true });

    dialogEl.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(true);
  });

  it('should emit closed when the dialog closes', () => {
    let closed = false;
    component.closed.subscribe(() => {
      closed = true;
    });

    component.open();
    component.close();

    expect(closed).toBe(true);
  });

  it('should still support content projected declaratively', () => {
    const hostFixture = TestBed.createComponent(TestHostComponent);
    hostFixture.detectChanges();

    hostFixture.componentInstance.dialog().open();

    const content = hostFixture.debugElement.query(By.directive(TestContentComponent)).componentInstance as TestContentComponent;

    expect(content.opened).toBe(true);
  });
});
