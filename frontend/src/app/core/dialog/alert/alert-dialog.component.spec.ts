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
    fixture.componentRef.setInput('messageKey', 'main_menu.new_game_error.message');
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // Regression: `okKey` defaults to `alert_dialog.ok`. Nothing catches a missing entry for that
  // key in `en.json` except actually reading the rendered label.
  it('should render translated text for the default ok label', () => {
    const okButton = fixture.debugElement.query(By.css('[data-testId=ok]')).nativeElement as HTMLElement;

    expect(okButton.textContent.trim()).toBe('OK');
    expect(okButton.textContent.trim()).not.toBe('alert_dialog.ok');
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
