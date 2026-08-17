import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, DestroyRef, inject, output, signal, Signal, viewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AuthService, User } from '@core/auth.service';
import { DialogContentWithResult, DialogOptions } from '@core/dialog.service';
import { InputLayer } from '@core/input-manager.service';
import { listNavigation } from '@core/list-navigation';
import { TranslocoDirective } from '@jsverse/transloco';
import { CredentialsFormComponent } from '@ui/components/credentials-form/credentials-form.component';
import { AH_DIALOG_CONTENT } from '@ui/components/dialog/dialog.content';

/**
 * Shared by every entry point to the prompt — the main menu's "sign in to continue" and the auth
 * interceptor's 401 — so the same dialog appears however it was reached. `m`: the choice view puts
 * two cards side by side, which 32rem squeezes into columns too narrow for their bullet lists.
 */
export const SIGN_IN_DIALOG_OPTIONS = { titleKey: 'auth.sign_in.title', size: 'm' } as const satisfies DialogOptions;

type View = 'choice' | 'credentials';

interface Choice {
  key: 'anonymous' | 'credentials';
  process: () => void;
}

type ErrorMessage = { kind: 'key'; key: string } | { kind: 'raw'; message: string };

interface IdentityError {
  code?: string;
  description?: string;
}

interface IdentityResult {
  succeeded: boolean;
  errors: IdentityError[];
}

@Component({
  selector: 'ah-sign-in',
  imports: [TranslocoDirective, CredentialsFormComponent],
  templateUrl: './sign-in.component.html',
  providers: [
    {
      provide: AH_DIALOG_CONTENT,
      useExisting: SignInComponent,
    },
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'cursor-reset',
  },
})
export class SignInComponent implements DialogContentWithResult<User> {
  private readonly auth = inject(AuthService);
  private readonly destroyRef = inject(DestroyRef);

  public readonly result = output<User>();

  protected readonly view = signal<View>('choice');
  protected readonly busy = signal(false);
  protected readonly error = signal<ErrorMessage | undefined>(undefined);

  protected readonly choices: Signal<Choice[]> = signal([
    {
      key: 'anonymous',
      process: () => {
        this.loginAnonymously();
      },
    },
    {
      key: 'credentials',
      process: () => {
        this.showCredentialsForm();
      },
    },
  ]);

  private readonly choiceNavigation = listNavigation({
    items: this.choices,
    onConfirm: choice => {
      choice.process();
    },
    orientation: 'horizontal',
  });
  protected readonly selectedIndex = this.choiceNavigation.selectedIndex;

  /** Only rendered while `view() === 'credentials'`, so this is `undefined` the rest of the time. */
  private readonly credentialsForm = viewChild(CredentialsFormComponent);

  public getInputHandlers: () => InputLayer = () => {
    if (this.view() === 'credentials') {
      // The keyboard path and the button path go through the same submission on the form's own
      // side, so nothing here restates what "confirm" or "cancel" mean in that view.
      return this.credentialsForm()?.getInputHandlers() ?? {};
    }

    return {
      ...this.choiceNavigation.handlers,
      cancel: () => {
        this.loginAnonymously();
      },
    };
  };

  protected showCredentialsForm(): void {
    this.error.set(undefined);
    this.view.set('credentials');
  }

  protected backToChoice(): void {
    this.error.set(undefined);
    this.view.set('choice');
  }

  /** `undefined` is a dismissal — back to the choice view, not a failure to report. */
  protected onFormResult(user: User | undefined): void {
    if (user === undefined) {
      this.backToChoice();
      return;
    }

    this.result.emit(user);
  }

  protected loginAnonymously(): void {
    if (this.busy()) return;

    this.busy.set(true);
    this.error.set(undefined);
    this.auth
      .loginAnonymously()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: user => {
          this.result.emit(user);
        },
        error: (err: unknown) => {
          this.busy.set(false);
          this.error.set(this.toErrorMessage(err));
        },
      });
  }

  private toErrorMessage(err: unknown): ErrorMessage {
    if (err instanceof HttpErrorResponse) {
      if (err.status === 403) return { kind: 'key', key: 'wrong_password' };

      if (err.status === 400) {
        const body = err.error as IdentityResult | null;
        const descriptions = (body?.errors ?? []).map(e => e.description).filter((d): d is string => Boolean(d));
        if (descriptions.length > 0) return { kind: 'raw', message: descriptions.join(' ') };
      }
    }

    return { kind: 'key', key: 'generic' };
  }
}
