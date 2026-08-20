import { ChangeDetectionStrategy, Component, provideZonelessChangeDetection, viewChild } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { AuthService, User } from '@core/auth/auth.service';
import { ConfirmDialogService } from '@core/dialog/confirm/confirm-dialog.service';
import { DialogComponent } from '@core/dialog/dialog.component';
import { DialogService } from '@core/dialog/dialog.service';
import { CREDENTIALS_DIALOG_OPTIONS, CredentialsFormComponent } from '@features/auth/credentials-form/credentials-form.component';
import { getTranslocoModule } from '@testing/transloco.testing';
import { BehaviorSubject, EMPTY, of } from 'rxjs';
import { vi } from 'vitest';
import { AccountComponent } from './account.component';

describe('AccountComponent', () => {
  let component: AccountComponent;
  let fixture: ComponentFixture<AccountComponent>;
  let user$: BehaviorSubject<User | undefined>;
  let logout: ReturnType<typeof vi.fn>;
  let openDialog: ReturnType<typeof vi.fn>;
  let confirm: ReturnType<typeof vi.fn>;

  const click = (testId: string) => {
    (fixture.debugElement.query(By.css(`[data-testId=${testId}]`)).nativeElement as HTMLElement).click();
    fixture.detectChanges();
  };

  beforeEach(async () => {
    user$ = new BehaviorSubject<User | undefined>(undefined);
    logout = vi.fn(() => of(undefined));
    openDialog = vi.fn(() => EMPTY);
    confirm = vi.fn(() => of(false));

    await TestBed.configureTestingModule({
      imports: [AccountComponent, getTranslocoModule()],
      providers: [
        provideZonelessChangeDetection(),
        { provide: AuthService, useValue: { currentUser: user$, logout } },
        { provide: DialogService, useValue: { open: openDialog } },
        { provide: ConfirmDialogService, useValue: { confirm } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AccountComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should show the signed-out state with a sign-in action', () => {
    expect(fixture.debugElement.query(By.css('[data-testId=sign_in]'))).toBeTruthy();
    expect(fixture.debugElement.query(By.css('[data-testId=sign_out]'))).toBeFalsy();
  });

  it('should show the anonymous state with the raw userName and an upgrade action', () => {
    user$.next({ isAnonymous: true, email: null, userName: 'guid-123' });
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).textContent).toContain('guid-123');
    expect(fixture.debugElement.query(By.css('[data-testId=upgrade]'))).toBeTruthy();
    expect(fixture.debugElement.query(By.css('[data-testId=sign_out]'))).toBeTruthy();
  });

  it('should show the permanent state with the registered name and email', () => {
    user$.next({ isAnonymous: false, email: 'a@example.com', userName: 'Alice' });
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent;

    expect(text).toContain('Alice');
    expect(text).toContain('a@example.com');
    expect(fixture.debugElement.query(By.css('[data-testId=upgrade]'))).toBeFalsy();
    expect(fixture.debugElement.query(By.css('[data-testId=sign_out]'))).toBeTruthy();
  });

  it('should sign out immediately when permanent', () => {
    user$.next({ isAnonymous: false, email: 'a@example.com', userName: 'Alice' });
    fixture.detectChanges();

    click('sign_out');

    expect(confirm).not.toHaveBeenCalled();
    expect(logout).toHaveBeenCalledWith();
  });

  it('should confirm before signing out an anonymous account, and leave the session on cancel', () => {
    confirm.mockReturnValue(of(false));
    user$.next({ isAnonymous: true, email: null, userName: 'guid-123' });
    fixture.detectChanges();

    click('sign_out');

    // Destructive, and opening on cancel — the appearance alone no longer decides that.
    expect(confirm).toHaveBeenCalledWith(expect.objectContaining({ appearance: 'error', defaultButton: 'cancel' }));
    expect(logout).not.toHaveBeenCalled();
  });

  it('should sign out an anonymous account once the warning is confirmed', () => {
    confirm.mockReturnValue(of(true));
    user$.next({ isAnonymous: true, email: null, userName: 'guid-123' });
    fixture.detectChanges();

    click('sign_out');

    expect(logout).toHaveBeenCalledWith();
  });

  it('should open the credentials form to upgrade an anonymous account, and change nothing when it is dismissed', () => {
    user$.next({ isAnonymous: true, email: null, userName: 'guid-123' });
    fixture.detectChanges();

    click('upgrade');

    expect(openDialog).toHaveBeenCalledWith(CredentialsFormComponent, CREDENTIALS_DIALOG_OPTIONS);
    // `EMPTY` from the mock stands in for a dismissal — nothing here subscribes to the result, and
    // `currentUser` is untouched, so the anonymous session is exactly as it was.
    expect(user$.value).toEqual({ isAnonymous: true, email: null, userName: 'guid-123' } satisfies User);
  });

  it('should open the credentials form to sign in when signed out', () => {
    click('sign_in');

    expect(openDialog).toHaveBeenCalledWith(CredentialsFormComponent, CREDENTIALS_DIALOG_OPTIONS);
  });

  it('should emit back on the back action', () => {
    let emittedCount = 0;
    component.back.subscribe(() => {
      emittedCount++;
    });

    click('back');

    expect(emittedCount).toBe(1);
  });

  describe('getInputHandlers', () => {
    it('should emit back on cancel', async () => {
      let emittedCount = 0;
      component.back.subscribe(() => {
        emittedCount++;
      });

      await component.getInputHandlers().cancel?.();

      expect(emittedCount).toBe(1);
    });
  });
});

@Component({
  selector: 'ah-account-dialog-test-host',
  imports: [DialogComponent, AccountComponent],
  template: `<ah-dialog><ah-account /></ah-dialog>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
class AccountDialogHostComponent {
  public readonly dialog = viewChild.required(DialogComponent);
}

// The block above mocks `DialogService`/`ConfirmDialogService` down to `{ open: openDialog }`/
// `{ confirm }` spies — it proves the right *request* is made, but a spy that never opens anything
// can never show what actually happens once a real dialog does. This block drives the real
// services instead, each test commented with what it owns that the mocked block above does not.
describe('AccountComponent through the real DialogService and ConfirmDialogService', () => {
  let hostFixture: ComponentFixture<AccountDialogHostComponent>;
  let hostUser$: BehaviorSubject<User | undefined>;
  let hostLogout: ReturnType<typeof vi.fn>;

  const clickInDocument = (testId: string) => {
    document.querySelector<HTMLElement>(`[data-testId=${testId}]`)?.click();
    TestBed.tick();
  };

  afterEach(() => {
    document.querySelectorAll('dialog').forEach(dialog => {
      dialog.remove();
    });
  });

  beforeEach(async () => {
    hostUser$ = new BehaviorSubject<User | undefined>({ isAnonymous: true, email: null, userName: 'guid-123' });
    hostLogout = vi.fn(() => of(undefined));

    await TestBed.configureTestingModule({
      imports: [AccountDialogHostComponent, getTranslocoModule()],
      providers: [provideZonelessChangeDetection(), { provide: AuthService, useValue: { currentUser: hostUser$, logout: hostLogout } }],
    }).compileComponents();

    hostFixture = TestBed.createComponent(AccountDialogHostComponent);
    hostFixture.detectChanges();
    hostFixture.componentInstance.dialog().open();
    hostFixture.detectChanges();
  });

  // Owns what the mocked block cannot: that `openCredentialsForm` really stacks a second,
  // independently-open `DialogService` dialog rather than replacing the one `AccountComponent`
  // itself is in — the mocked test only sees that `openDialog` was called with the right arguments.
  // The top-layer paint order (which dialog visually sits over the other) stays at F1 —
  // `account.stories.ts`'s `UpgradeStacked` — because that needs real layout.
  it('should open a second, independently-open dialog for the credentials form, leaving the account dialog open', () => {
    clickInDocument('upgrade');

    const dialogs = Array.from(document.querySelectorAll('dialog'));
    expect(dialogs).toHaveLength(2);

    const [accountDialog, credentialsDialog] = dialogs;
    if (!accountDialog || !credentialsDialog) throw new Error('Expected the account dialog and the credentials form to both be open');

    expect(accountDialog.open).toBe(true);
    expect(credentialsDialog.open).toBe(true);
    expect(credentialsDialog.querySelector('form')).toBeTruthy();
    expect(credentialsDialog.querySelector('h1')?.textContent.trim()).toBe('The Binding Rite');
  });

  // Owns what the mocked block cannot: that confirming the *real* confirm dialog's own button
  // actually reaches `AuthService.logout` — the mocked test only sees that `confirm` was called
  // with the right options, never that a real "yes" answer propagates through it.
  it('should call logout once the real sign-out confirm dialog is confirmed', () => {
    clickInDocument('sign_out');
    clickInDocument('confirm');

    expect(hostLogout).toHaveBeenCalledWith();
  });

  // Owns what the mocked block cannot: that the real confirm dialog actually opens with Cancel
  // selected (not just that `defaultButton: 'cancel'` was requested), and that confirming through
  // the real input layer on a freshly opened prompt reaches Cancel, not logout.
  it('should default the real sign-out confirm dialog to Cancel, and not log out when it is the one confirmed', () => {
    clickInDocument('sign_out');

    const cancelButton = document.querySelector<HTMLElement>('[data-testId=cancel]');
    expect(cancelButton?.classList).toContain('btn-accent');
    expect(cancelButton?.classList).not.toContain('btn-soft');

    document.dispatchEvent(new KeyboardEvent('keydown', { code: 'Enter' }));
    TestBed.tick();

    expect(hostLogout).not.toHaveBeenCalled();
  });
});
