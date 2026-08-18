import { inputBinding, provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { getTranslocoModule } from '@testing/transloco.testing';
import { DialogComponent } from '../dialog.component';
import { ConfirmDialogComponent } from './confirm-dialog.component';

describe('ConfirmDialogComponent', () => {
  let component: ConfirmDialogComponent;
  let fixture: ComponentFixture<ConfirmDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ConfirmDialogComponent, getTranslocoModule()],
      providers: [provideZonelessChangeDetection()],
    }).compileComponents();

    fixture = TestBed.createComponent(ConfirmDialogComponent);
    fixture.componentRef.setInput('messageKey', 'settings.account.sign_out_warning.message');
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // Regression: `confirmKey`/`cancelKey` default to `confirm_dialog.confirm`/`.cancel`. Nothing
  // catches a missing entry for those keys in `en.json` except actually reading the rendered
  // label — `toBeTruthy()` on the button passes just as well for the untranslated key string.
  it('should render translated text for the default confirm and cancel labels', () => {
    const confirmButton = fixture.debugElement.query(By.css('[data-testId=confirm]')).nativeElement as HTMLElement;
    const cancelButton = fixture.debugElement.query(By.css('[data-testId=cancel]')).nativeElement as HTMLElement;

    expect(confirmButton.textContent.trim()).toBe('Confirm');
    expect(confirmButton.textContent.trim()).not.toBe('confirm_dialog.confirm');
    expect(cancelButton.textContent.trim()).toBe('Cancel');
    expect(cancelButton.textContent.trim()).not.toBe('confirm_dialog.cancel');
  });

  it('should emit true when confirmed', () => {
    const emitted: boolean[] = [];
    component.result.subscribe(value => {
      emitted.push(value);
    });

    (fixture.debugElement.query(By.css('[data-testId=confirm]')).nativeElement as HTMLElement).click();

    expect(emitted).toEqual([true]);
  });

  it('should emit false when cancelled', () => {
    const emitted: boolean[] = [];
    component.result.subscribe(value => {
      emitted.push(value);
    });

    (fixture.debugElement.query(By.css('[data-testId=cancel]')).nativeElement as HTMLElement).click();

    expect(emitted).toEqual([false]);
  });

  it('should emit false on the cancel input command', async () => {
    const emitted: boolean[] = [];
    component.result.subscribe(value => {
      emitted.push(value);
    });

    await component.getInputHandlers().cancel?.();

    expect(emitted).toEqual([false]);
  });

  // Selection is decided in ngOnInit, so these build their own fixture with the inputs set before
  // the first change detection — the order the real dialog produces, and the order that broke when
  // this was read from `onOpened` instead.
  const createWith = (inputs: Record<string, unknown>): ComponentFixture<ConfirmDialogComponent> => {
    const created = TestBed.createComponent(ConfirmDialogComponent);
    created.componentRef.setInput('messageKey', 'settings.account.sign_out_warning.message');
    for (const [name, value] of Object.entries(inputs)) created.componentRef.setInput(name, value);
    created.detectChanges();
    return created;
  };

  const buttonIn = (target: ComponentFixture<ConfirmDialogComponent>, testId: string) =>
    target.debugElement.query(By.css(`[data-testId=${testId}]`)).nativeElement as HTMLElement;

  // Selection is emphasis — solid when selected, `btn-soft` when not — so that neither button has
  // to borrow the other's colour to show it is selected.
  it('should default to selecting confirm', () => {
    const created = createWith({});

    expect(buttonIn(created, 'confirm').classList).toContain('btn-primary');
    expect(buttonIn(created, 'confirm').classList).not.toContain('btn-soft');
  });

  it('should open on the button the caller nominated', () => {
    const created = createWith({ appearance: 'error', defaultButton: 'cancel' });

    expect(buttonIn(created, 'cancel').classList).toContain('btn-accent');
    expect(buttonIn(created, 'cancel').classList).not.toContain('btn-soft');

    // Unselected, but still visibly the destructive one — and never wearing cancel's colour.
    expect(buttonIn(created, 'confirm').classList).toContain('btn-error');
    expect(buttonIn(created, 'confirm').classList).toContain('btn-soft');
    expect(buttonIn(created, 'confirm').classList).not.toContain('btn-accent');
  });

  // Appearance and default selection are independent: a red confirm button is not on its own a
  // reason to move the selection, so a caller that wants cancel selected has to say so.
  it('should keep confirm selected for a destructive appearance that did not ask otherwise', () => {
    const created = createWith({ appearance: 'error' });

    expect(buttonIn(created, 'confirm').classList).not.toContain('btn-soft');
  });

  // The path the app actually takes: `DialogService` creates the content with `inputBinding`s and
  // opens it, and change detection applies those bindings. Reading `defaultButton` from `onOpened`
  // passed every isolated test above and still ignored the caller here, because `open()` runs
  // before the content's first change detection.
  it('should honour a nominated default button when opened as real dialog content', () => {
    const dialogFixture = TestBed.createComponent(DialogComponent);
    dialogFixture.detectChanges();

    dialogFixture.componentInstance.attachContent(ConfirmDialogComponent, [
      inputBinding('messageKey', () => 'settings.account.sign_out_warning.message'),
      inputBinding('appearance', () => 'error'),
      inputBinding('defaultButton', () => 'cancel'),
    ]);
    dialogFixture.componentInstance.open();
    dialogFixture.detectChanges();

    const cancelButton = (dialogFixture.nativeElement as HTMLElement).querySelector<HTMLElement>('[data-testId=cancel]');

    expect(cancelButton?.classList).toContain('btn-accent');
    expect(cancelButton?.classList).not.toContain('btn-soft');
  });

  it('should activate the selected button on confirm', async () => {
    const emitted: boolean[] = [];
    component.result.subscribe(value => {
      emitted.push(value);
    });

    await component.getInputHandlers().moveRight?.();
    await component.getInputHandlers().confirm?.();

    expect(emitted).toEqual([false]);
  });
});
