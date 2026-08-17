import { HttpErrorResponse } from '@angular/common/http';
import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { AuthService, User } from '@core/auth.service';
import { getTranslocoModule } from '@testing/transloco.testing';
import { Subject } from 'rxjs';
import { vi } from 'vitest';
import { CredentialsFormComponent } from './credentials-form.component';

describe('CredentialsFormComponent', () => {
  let component: CredentialsFormComponent;
  let fixture: ComponentFixture<CredentialsFormComponent>;
  let signIn$: Subject<User>;
  let signIn: ReturnType<typeof vi.fn>;

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

  const submitButton = () => fixture.debugElement.query(By.css('.btn-primary')).nativeElement as HTMLButtonElement;
  const dismissButton = () => fixture.debugElement.query(By.css('.btn-active')).nativeElement as HTMLButtonElement;

  beforeEach(async () => {
    signIn$ = new Subject<User>();
    signIn = vi.fn(() => signIn$);

    await TestBed.configureTestingModule({
      imports: [CredentialsFormComponent, getTranslocoModule()],
      providers: [
        provideZonelessChangeDetection(),
        {
          provide: AuthService,
          useValue: { signIn },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(CredentialsFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should disable submit while the form is invalid', () => {
    expect(submitButton().disabled).toBe(true);

    fillValidCredentials();

    expect(submitButton().disabled).toBe(false);
  });

  it('should emit a User when submitting valid credentials', async () => {
    const emitted: (User | undefined)[] = [];
    component.result.subscribe(user => {
      emitted.push(user);
    });

    fillValidCredentials();
    submitButton().click();
    // `FormRoot` runs the submission through the forms package's own async `submit()`, which
    // resolves validity before calling `action` — a microtask beyond the click.
    await fixture.whenStable();
    signIn$.next({ isAnonymous: false, email: 'a@example.com', userName: 'a' });
    // A second hop: `next()` resolves the promise `action` is awaiting, and `result.emit` runs
    // once that resumes, not synchronously with the call above.
    await fixture.whenStable();

    expect(signIn).toHaveBeenCalledWith({ email: 'a@example.com', username: 'a', password: 'P@ssw0rd' });
    expect(emitted).toEqual([{ isAnonymous: false, email: 'a@example.com', userName: 'a' } satisfies User]);
  });

  it('should show a translated message on 403', async () => {
    fillValidCredentials();
    submitButton().click();
    await fixture.whenStable();
    signIn$.error(new HttpErrorResponse({ status: 403 }));

    const alert = await vi.waitFor(() => {
      fixture.detectChanges();
      return fixture.debugElement.query(By.css('.alert')).nativeElement as HTMLElement;
    });

    expect(alert.textContent).toContain('incorrect');
  });

  it('should render IdentityResult descriptions on 400', async () => {
    fillValidCredentials();
    submitButton().click();
    await fixture.whenStable();
    signIn$.error(
      new HttpErrorResponse({
        status: 400,
        error: { succeeded: false, errors: [{ code: 'password_short', description: 'Passwords must be at least 6 characters.' }] },
      }),
    );

    const alert = await vi.waitFor(() => {
      fixture.detectChanges();
      return fixture.debugElement.query(By.css('.alert')).nativeElement as HTMLElement;
    });

    expect(alert.textContent).toContain('Passwords must be at least 6 characters.');
  });

  it('should emit undefined when dismissed', () => {
    const emitted: (User | undefined)[] = [];
    component.result.subscribe(user => {
      emitted.push(user);
    });

    dismissButton().click();

    expect(emitted).toEqual([undefined]);
  });

  describe('getInputHandlers', () => {
    it('should dismiss on cancel', async () => {
      const emitted: (User | undefined)[] = [];
      component.result.subscribe(user => {
        emitted.push(user);
      });

      await component.getInputHandlers().cancel?.();

      expect(emitted).toEqual([undefined]);
    });

    it('should submit through requestSubmit on confirm', async () => {
      fillValidCredentials();

      await component.getInputHandlers().confirm?.();

      expect(signIn).toHaveBeenCalledWith({ email: 'a@example.com', username: 'a', password: 'P@ssw0rd' });
    });
  });
});
