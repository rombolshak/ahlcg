import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { getTranslocoModule } from '@testing/transloco.testing';
import { AlertDialogComponent } from './alert-dialog.component';

describe('AlertDialogComponent', () => {
  let component: AlertDialogComponent;
  let fixture: ComponentFixture<AlertDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AlertDialogComponent, getTranslocoModule()],
      providers: [provideZonelessChangeDetection()],
    }).compileComponents();

    fixture = TestBed.createComponent(AlertDialogComponent);
    fixture.componentRef.setInput('title', 'The page stays blank');
    fixture.componentRef.setInput('message', 'The investigation could not be started. Try again in a moment.');
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // Regression: `okText` falls back to the `core/dialog/alert` scope's `ok` key. Nothing catches a
  // missing entry for that key except actually reading the rendered label.
  it('should render translated text for the default ok label', () => {
    const okButton = fixture.debugElement.query(By.css('[data-testId=ok]')).nativeElement as HTMLElement;

    expect(okButton.textContent.trim()).toBe('OK');
    expect(okButton.textContent.trim()).not.toBe('ok');
  });

  it('should emit result when the button is clicked', () => {
    let emitted = 0;
    component.result.subscribe(() => {
      emitted++;
    });

    (fixture.debugElement.query(By.css('[data-testId=ok]')).nativeElement as HTMLElement).click();

    expect(emitted).toBe(1);
  });

  it('should emit result on the confirm input command', async () => {
    let emitted = 0;
    component.result.subscribe(() => {
      emitted++;
    });

    await component.getInputHandlers().confirm?.();

    expect(emitted).toBe(1);
  });

  it('should emit result on the cancel input command', async () => {
    let emitted = 0;
    component.result.subscribe(() => {
      emitted++;
    });

    await component.getInputHandlers().cancel?.();

    expect(emitted).toBe(1);
  });
});
