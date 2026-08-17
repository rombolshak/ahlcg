import { HttpErrorResponse } from '@angular/common/http';
import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { AuthService, User } from '@core/auth.service';
import { getTranslocoModule } from '@testing/transloco.testing';
import { DialogComponent } from '@ui/components/dialog/dialog.component';
import { Subject } from 'rxjs';
import { vi } from 'vitest';
import { SignInComponent } from './sign-in.component';

describe('SignInComponent', () => {
  let component: SignInComponent;
  let fixture: ComponentFixture<SignInComponent>;
  let loginAnonymously$: Subject<User>;
  let signIn$: Subject<User>;
  let loginAnonymously: ReturnType<typeof vi.fn>;
  let signIn: ReturnType<typeof vi.fn>;

  const click = (testId: string) => {
    (fixture.debugElement.query(By.css(`[data-testId=${testId}]`)).nativeElement as HTMLElement).click();
    fixture.detectChanges();
  };

  const setInputValue = (type: string, value: string) => {
    const input = fixture.debugElement.query(By.css(`input[type=${type}]`)).nativeElement as HTMLInputElement;
    input.value = value;
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
  };

  const fillValidCredentials = () => {
    setInputValue('email', 'a@example.com');
    setInputValue('text', 'a');
    setInputValue('password', 'P@ssw0rd');
  };

  beforeEach(async () => {
    loginAnonymously$ = new Subject<User>();
    signIn$ = new Subject<User>();
    loginAnonymously = vi.fn(() => loginAnonymously$);
    signIn = vi.fn(() => signIn$);

    await TestBed.configureTestingModule({
      imports: [SignInComponent, getTranslocoModule()],
      providers: [
        provideZonelessChangeDetection(),
        {
          provide: AuthService,
          useValue: { loginAnonymously, signIn },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(SignInComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should emit a User when choosing to travel light', () => {
    const emitted: User[] = [];
    component.result.subscribe(user => {
      emitted.push(user);
    });

    click('anonymous');
    loginAnonymously$.next({ isAnonymous: true, email: null, userName: 'anon-guid' });

    expect(emitted).toEqual([{ isAnonymous: true, email: null, userName: 'anon-guid' } satisfies User]);
  });

  it('should show a translated message in the choice view when travelling light fails', () => {
    click('anonymous');
    loginAnonymously$.error(new HttpErrorResponse({ status: 403 }));
    fixture.detectChanges();

    const alert = fixture.debugElement.query(By.css('.alert')).nativeElement as HTMLElement;

    expect(alert.textContent).toContain('incorrect');
  });

  it('should render the credentials form when choosing to bind an account', () => {
    click('credentials');

    expect(fixture.debugElement.query(By.css('.fieldset'))).toBeTruthy();
  });

  it('should emit a User when the credentials form resolves', async () => {
    const emitted: User[] = [];
    component.result.subscribe(user => {
      emitted.push(user);
    });

    click('credentials');
    fillValidCredentials();
    (fixture.debugElement.query(By.css('.btn-primary')).nativeElement as HTMLElement).click();
    // The credentials form's own signal-forms submission resolves over a couple of microtasks
    // beyond the click, and `result.emit` runs once that settles.
    await fixture.whenStable();
    signIn$.next({ isAnonymous: false, email: 'a@example.com', userName: 'a' });
    await fixture.whenStable();

    expect(emitted).toEqual([{ isAnonymous: false, email: 'a@example.com', userName: 'a' } satisfies User]);
  });

  it('should go back to the choice view when the credentials form is dismissed', () => {
    click('credentials');

    (fixture.debugElement.query(By.css('.btn-active')).nativeElement as HTMLElement).click();
    fixture.detectChanges();

    expect(fixture.debugElement.query(By.css('.fieldset'))).toBeFalsy();
  });

  describe('getInputHandlers', () => {
    it('should travel light on cancel and confirm the selected panel in the choice view', async () => {
      await component.getInputHandlers().cancel?.();

      expect(loginAnonymously).toHaveBeenCalledWith();
    });

    it('should move the selection between panels in the choice view', async () => {
      const selected = () => fixture.debugElement.query(By.css('.bg-primary')).nativeElement as HTMLElement;

      expect(selected().getAttribute('data-testId')).toBe('anonymous');

      await component.getInputHandlers().moveRight?.();
      fixture.detectChanges();

      expect(selected().getAttribute('data-testId')).toBe('credentials');

      await component.getInputHandlers().moveLeft?.();
      fixture.detectChanges();

      expect(selected().getAttribute('data-testId')).toBe('anonymous');
    });

    it('should confirm the selected panel', async () => {
      await component.getInputHandlers().moveRight?.();
      await component.getInputHandlers().confirm?.();
      fixture.detectChanges();

      expect(fixture.debugElement.query(By.css('.fieldset'))).toBeTruthy();
    });

    it('should go back to the choice view on cancel, and delegate confirm to the credentials form', async () => {
      click('credentials');

      await component.getInputHandlers().cancel?.();
      fixture.detectChanges();

      expect(fixture.debugElement.query(By.css('.fieldset'))).toBeFalsy();

      click('credentials');
      fillValidCredentials();
      await component.getInputHandlers().confirm?.();

      expect(signIn).toHaveBeenCalledWith({ email: 'a@example.com', username: 'a', password: 'P@ssw0rd' });
    });
  });

  // The unit tests above call `getInputHandlers()` directly, which cannot catch a caller that asks
  // for the handlers once and keeps them. These go through the real path — mounted in a
  // `DialogComponent`, driven by keys the `InputManagerService` listener picks up off the document.
  describe('inside a dialog', () => {
    let dialogFixture: ComponentFixture<DialogComponent>;

    const press = (code: string) => {
      document.dispatchEvent(new KeyboardEvent('keydown', { code }));
      dialogFixture.detectChanges();
    };

    const showsCredentialsView = () => Boolean((dialogFixture.nativeElement as HTMLElement).querySelector('.fieldset'));

    const setDialogInputValue = (type: string, value: string) => {
      const input = (dialogFixture.nativeElement as HTMLElement).querySelector<HTMLInputElement>(`input[type=${type}]`);
      if (!input) throw new Error(`No input[type=${type}] found in the dialog`);
      input.value = value;
      input.dispatchEvent(new Event('input'));
      dialogFixture.detectChanges();
    };

    beforeEach(() => {
      dialogFixture = TestBed.createComponent(DialogComponent);
      dialogFixture.detectChanges();
      dialogFixture.componentInstance.attachContent(SignInComponent);
      dialogFixture.detectChanges();
      dialogFixture.componentInstance.open();

      (dialogFixture.nativeElement as HTMLElement).querySelector<HTMLElement>('[data-testId=credentials]')?.click();
      dialogFixture.detectChanges();
    });

    it('should go back to the choice view on Escape rather than starting an anonymous login', () => {
      expect(showsCredentialsView()).toBe(true);

      press('Escape');

      expect(showsCredentialsView()).toBe(false);
      expect(loginAnonymously).not.toHaveBeenCalled();
    });

    it('should submit the credentials on Enter rather than re-running the chosen panel', () => {
      expect(showsCredentialsView()).toBe(true);

      setDialogInputValue('email', 'a@example.com');
      setDialogInputValue('text', 'a');
      setDialogInputValue('password', 'P@ssw0rd');

      press('Enter');

      expect(signIn).toHaveBeenCalledWith({ email: 'a@example.com', username: 'a', password: 'P@ssw0rd' });
      expect(loginAnonymously).not.toHaveBeenCalled();
    });
  });
});
