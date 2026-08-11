import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, DestroyRef, inject, output, signal, Signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { TranslocoDirective } from '@jsverse/transloco';
import { AuthService, Credentials, User } from '@services/auth.service';
import { InputLayer } from '@services/input-manager.service';
import { listNavigation } from '@services/list-navigation';
import { AH_DIALOG_CONTENT, DialogContent } from '@shared/components/dialog/dialog.content';

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
  imports: [TranslocoDirective],
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
export class SignInComponent implements DialogContent {
  private readonly auth = inject(AuthService);
  private readonly destroyRef = inject(DestroyRef);

  public readonly result = output<User>();

  protected readonly view = signal<View>('choice');
  protected readonly busy = signal(false);
  protected readonly error = signal<ErrorMessage | undefined>(undefined);

  protected readonly email = signal('');
  protected readonly username = signal('');
  protected readonly password = signal('');

  protected readonly choices: Signal<Choice[]> = signal([
    {
      key: 'anonymous',
      process: () => {
        this.travelLight();
      },
    },
    {
      key: 'credentials',
      process: () => {
        this.showCredentials();
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

  public getInputHandlers: () => InputLayer = () => {
    if (this.view() === 'credentials') {
      return {
        cancel: () => {
          this.backToChoice();
        },
        confirm: () => {
          this.submit();
        },
      };
    }

    return {
      ...this.choiceNavigation.handlers,
      cancel: () => {
        this.travelLight();
      },
    };
  };

  protected onEmailInput(event: Event): void {
    this.email.set((event.target as HTMLInputElement).value);
  }

  protected onUsernameInput(event: Event): void {
    this.username.set((event.target as HTMLInputElement).value);
  }

  protected onPasswordInput(event: Event): void {
    this.password.set((event.target as HTMLInputElement).value);
  }

  protected showCredentials(): void {
    this.error.set(undefined);
    this.view.set('credentials');
  }

  protected backToChoice(): void {
    this.error.set(undefined);
    this.view.set('choice');
  }

  protected travelLight(): void {
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

  protected submit(): void {
    if (this.busy()) return;

    const credentials: Credentials = { email: this.email(), username: this.username(), password: this.password() };
    this.busy.set(true);
    this.error.set(undefined);
    this.auth
      .signIn(credentials)
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
      if (err.status === 403) return { kind: 'key', key: 'errors.wrong_password' };

      if (err.status === 400) {
        const body = err.error as IdentityResult | null;
        const descriptions = (body?.errors ?? []).map(e => e.description).filter((d): d is string => Boolean(d));
        if (descriptions.length > 0) return { kind: 'raw', message: descriptions.join(' ') };
      }
    }

    return { kind: 'key', key: 'errors.generic' };
  }
}
