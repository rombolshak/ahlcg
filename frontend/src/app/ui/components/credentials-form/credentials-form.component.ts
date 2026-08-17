import { ChangeDetectionStrategy, Component, DestroyRef, ElementRef, inject, input, output, signal, viewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { email, form, FormField, FormRoot, required } from '@angular/forms/signals';
import { AuthService, Credentials, User } from '@core/auth.service';
import { DialogContentWithResult, DialogOptions } from '@core/dialog.service';
import { InputLayer } from '@core/input-manager.service';
import { TranslocoDirective } from '@jsverse/transloco';
import { AH_DIALOG_CONTENT } from '@ui/components/dialog/dialog.content';
import { FocusTrapDirective } from '@ui/directives/focus-trap.directive';
import { firstValueFrom } from 'rxjs';
import { toValidationError } from './credentials-form.errors';

/**
 * The dialog title when the form is opened directly (bind an anonymous account, sign in from
 * Settings). `SignInComponent` never uses this — it opens the form as a view inside its own
 * already-titled dialog.
 */
export const CREDENTIALS_DIALOG_OPTIONS = { titleKey: 'auth.credentials_form.title', size: 's' } as const satisfies DialogOptions;

/**
 * The email/username/password sign-in-or-register-or-upgrade form, extracted from `SignInComponent`
 * so `DialogService` can open it on its own — both account-section entry points need that, since
 * neither shows the choice view. Angular's first Signal Form in this codebase: submission is
 * declarative (`[formRoot]` + `submission.action`), not an imperative `submit()` call.
 */
@Component({
  selector: 'ah-credentials-form',
  imports: [FormField, FormRoot, TranslocoDirective, FocusTrapDirective],
  templateUrl: './credentials-form.component.html',
  providers: [
    {
      provide: AH_DIALOG_CONTENT,
      useExisting: CredentialsFormComponent,
    },
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CredentialsFormComponent implements DialogContentWithResult<User | undefined> {
  private readonly auth = inject(AuthService);
  private readonly destroyRef = inject(DestroyRef);

  /** Relative to the `auth.credentials_form` prefix, so a host can relabel the secondary button. */
  public readonly submitKey = input('submit');
  public readonly dismissKey = input('cancel');

  /** `undefined` on dismissal — `DialogService` tears down on any emission, so a standalone form
   * closes itself on either outcome, while `SignInComponent` maps `undefined` back to its choice
   * view. No further plumbing is needed for either host. */
  public readonly result = output<User | undefined>();

  private readonly formElement = viewChild.required<ElementRef<HTMLFormElement>>('form');

  protected readonly credentials = signal<Credentials>({ email: '', username: '', password: '' });

  protected readonly signInForm = form(
    this.credentials,
    path => {
      required(path.email);
      email(path.email);
      required(path.username);
      required(path.password);
    },
    {
      submission: {
        action: async () => {
          try {
            this.result.emit(await firstValueFrom(this.auth.signIn(this.credentials()).pipe(takeUntilDestroyed(this.destroyRef))));
            return undefined;
          } catch (err: unknown) {
            return toValidationError(err);
          }
        },
      },
    },
  );

  /** `confirm` submits through the same path a button click does, rather than restating it — the
   * keyboard's only route in, since `InputManagerService` already claims `Enter` inside text inputs. */
  public getInputHandlers: () => InputLayer = () => ({
    cancel: () => {
      this.dismiss();
    },
    confirm: () => {
      this.formElement().nativeElement.requestSubmit();
    },
  });

  protected dismiss(): void {
    this.result.emit(undefined);
  }
}
