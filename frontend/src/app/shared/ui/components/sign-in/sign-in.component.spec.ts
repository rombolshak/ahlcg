import { HttpErrorResponse } from '@angular/common/http';
import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { getTranslocoModule } from '@domain/test/transloco.testing';
import { AuthService, User } from '@services/auth.service';
import { DialogComponent } from '@shared/components/dialog/dialog.component';
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
    loginAnonymously$.next({ isAnonymous: true, email: null });

    expect(emitted).toEqual([{ isAnonymous: true, email: null } satisfies User]);
  });

  it('should emit a User when submitting valid credentials', () => {
    const emitted: User[] = [];
    component.result.subscribe(user => {
      emitted.push(user);
    });

    click('credentials');
    setInputValue('email', 'a@example.com');
    setInputValue('text', 'a');
    setInputValue('password', 'P@ssw0rd');
    (fixture.debugElement.query(By.css('.btn-primary')).nativeElement as HTMLElement).click();
    signIn$.next({ isAnonymous: false, email: 'a@example.com' });

    expect(signIn).toHaveBeenCalledWith({ email: 'a@example.com', username: 'a', password: 'P@ssw0rd' });
    expect(emitted).toEqual([{ isAnonymous: false, email: 'a@example.com' } satisfies User]);
  });

  it('should keep the dialog open with the typed values and show a translated message on 403', () => {
    click('credentials');
    setInputValue('email', 'a@example.com');
    setInputValue('text', 'a');
    setInputValue('password', 'wrong');
    (fixture.debugElement.query(By.css('.btn-primary')).nativeElement as HTMLElement).click();
    signIn$.error(new HttpErrorResponse({ status: 403 }));
    fixture.detectChanges();

    const alert = fixture.debugElement.query(By.css('.alert')).nativeElement as HTMLElement;

    expect(alert.textContent).toContain('Those particulars do not match our records.');
    expect((fixture.debugElement.query(By.css('input[type=email]')).nativeElement as HTMLInputElement).value).toBe('a@example.com');
  });

  it('should render IdentityResult descriptions on 400', () => {
    click('credentials');
    setInputValue('email', 'a@example.com');
    setInputValue('text', 'a');
    setInputValue('password', 'short');
    (fixture.debugElement.query(By.css('.btn-primary')).nativeElement as HTMLElement).click();
    signIn$.error(
      new HttpErrorResponse({
        status: 400,
        error: { succeeded: false, errors: [{ code: 'password_short', description: 'Passwords must be at least 6 characters.' }] },
      }),
    );
    fixture.detectChanges();

    const alert = fixture.debugElement.query(By.css('.alert')).nativeElement as HTMLElement;

    expect(alert.textContent).toContain('Passwords must be at least 6 characters.');
  });

  describe('getInputHandlers', () => {
    it('should travel light on cancel and confirm the selected panel in the choice view', async () => {
      await component.getInputHandlers().cancel?.();

      expect(loginAnonymously).toHaveBeenCalledWith();
    });

    it('should move the selection between panels in the choice view', async () => {
      const selected = () => fixture.debugElement.query(By.css('.border-primary')).nativeElement as HTMLElement;

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

    it('should go back to the choice view on cancel and submit on confirm in the credentials view', async () => {
      click('credentials');

      await component.getInputHandlers().cancel?.();
      fixture.detectChanges();

      expect(fixture.debugElement.query(By.css('.fieldset'))).toBeFalsy();

      click('credentials');
      await component.getInputHandlers().confirm?.();

      expect(signIn).toHaveBeenCalledWith({ email: '', username: '', password: '' });
    });
  });

  // The unit tests above call `getInputHandlers()` directly, which cannot catch a caller that asks
  // for the handlers once and keeps them. These go through the real path — mounted in a
  // `DialogComponent`, driven by keys the `InputManagerService` listener picks up off the document.
  describe('inside a dialog', () => {
    let dialogFixture: ComponentFixture<DialogComponent>;

    const press = (code: string) => {
      document.dispatchEvent(new KeyboardEvent('keyup', { code }));
      dialogFixture.detectChanges();
    };

    const showsCredentialsView = () => Boolean((dialogFixture.nativeElement as HTMLElement).querySelector('.fieldset'));

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

      press('Enter');

      expect(signIn).toHaveBeenCalledWith({ email: '', username: '', password: '' });
      expect(loginAnonymously).not.toHaveBeenCalled();
    });
  });
});
