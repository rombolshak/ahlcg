import { ChangeDetectionStrategy, Component, computed, DestroyRef, inject, output, Signal } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { AuthService } from '@core/auth.service';
import { ConfirmDialogService } from '@core/confirm-dialog.service';
import { DialogService } from '@core/dialog.service';
import { InputLayer } from '@core/input-manager.service';
import { listNavigation } from '@core/list-navigation';
import { TranslocoDirective } from '@jsverse/transloco';
import { CREDENTIALS_DIALOG_OPTIONS, CredentialsFormComponent } from '@ui/components/credentials-form/credentials-form.component';
import { filter, switchMap } from 'rxjs';

type AccountState = 'anonymous' | 'permanent' | 'signed_out';

interface AccountAction {
  key: 'upgrade' | 'sign_out' | 'sign_in' | 'back';
  /** Relative to the `settings.account` prefix — `back` lives there directly, the rest under the
   * current state's own sub-key. */
  labelKey: string;
  process: () => void;
}

/**
 * A view inside the settings dialog, not dialog content of its own — reached by confirming the
 * "Account" row in `SettingsComponent`. Shows who is signed in and offers that state's actions.
 */
@Component({
  selector: 'ah-account',
  imports: [TranslocoDirective],
  templateUrl: './account.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AccountComponent {
  private readonly auth = inject(AuthService);
  private readonly dialog = inject(DialogService);
  private readonly confirmDialog = inject(ConfirmDialogService);
  private readonly destroyRef = inject(DestroyRef);

  public readonly back = output();

  protected readonly user = toSignal(this.auth.currentUser);
  protected readonly state: Signal<AccountState> = computed(() => {
    const user = this.user();
    if (user === undefined) return 'signed_out';
    return user.isAnonymous ? 'anonymous' : 'permanent';
  });

  protected readonly actions = computed<AccountAction[]>(() => {
    switch (this.state()) {
      case 'anonymous':
        return [
          {
            key: 'upgrade',
            labelKey: 'anonymous.upgrade',
            process: () => {
              this.openCredentialsForm();
            },
          },
          {
            key: 'sign_out',
            labelKey: 'anonymous.sign_out',
            process: () => {
              this.signOutAnonymous();
            },
          },
          {
            key: 'back',
            labelKey: 'back',
            process: () => {
              this.back.emit();
            },
          },
        ];
      case 'permanent':
        return [
          {
            key: 'sign_out',
            labelKey: 'permanent.sign_out',
            process: () => {
              this.signOutPermanent();
            },
          },
          {
            key: 'back',
            labelKey: 'back',
            process: () => {
              this.back.emit();
            },
          },
        ];
      case 'signed_out':
        return [
          {
            key: 'sign_in',
            labelKey: 'signed_out.sign_in',
            process: () => {
              this.openCredentialsForm();
            },
          },
          {
            key: 'back',
            labelKey: 'back',
            process: () => {
              this.back.emit();
            },
          },
        ];
    }
  });

  private readonly navigation = listNavigation({
    items: this.actions,
    onConfirm: action => {
      action.process();
    },
    orientation: 'horizontal',
  });
  protected readonly selectedIndex = this.navigation.selectedIndex;

  public getInputHandlers: () => InputLayer = () => ({
    ...this.navigation.handlers,
    cancel: () => {
      this.back.emit();
    },
  });

  /**
   * Stacked over the settings dialog, not a replacement for it. No result subscription: `signIn()`
   * refreshes `AuthService.currentUser` itself, so `state` and `user` re-derive on their own —
   * dismissing the form changes nothing, which is the whole point for an anonymous session.
   */
  protected openCredentialsForm(): void {
    this.dialog.open(CredentialsFormComponent, CREDENTIALS_DIALOG_OPTIONS);
  }

  protected signOutPermanent(): void {
    this.auth.logout().pipe(takeUntilDestroyed(this.destroyRef)).subscribe();
  }

  /** Logging out deletes an anonymous account for good, so it is warned rather than immediate. */
  protected signOutAnonymous(): void {
    this.confirmDialog
      .confirm({
        titleKey: 'settings.account.sign_out_warning.title',
        messageKey: 'settings.account.sign_out_warning.message',
        confirmKey: 'settings.account.sign_out_warning.confirm',
        cancelKey: 'settings.account.sign_out_warning.cancel',
        appearance: 'error',
        // Deleting the account for good is never one Enter away from a dialog that just appeared.
        defaultButton: 'cancel',
      })
      .pipe(
        filter(Boolean),
        switchMap(() => this.auth.logout()),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe();
  }
}
