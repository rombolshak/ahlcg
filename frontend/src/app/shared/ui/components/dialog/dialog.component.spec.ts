import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ChangeDetectionStrategy, Component, provideZonelessChangeDetection, viewChild } from '@angular/core';
import { By } from '@angular/platform-browser';
import { InputManagerService } from '@services/input-manager.service';
import { vi } from 'vitest';
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
    expect(typeof pushSpy.mock.calls[0]?.[0].confirm).toBe('function');
  });

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
