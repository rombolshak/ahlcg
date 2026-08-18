import { ChangeDetectionStrategy, Component, computed, inject, Signal, viewChild } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { AuthService } from '@core/auth.service';
import { DialogComponent } from '@core/dialog/dialog.component';
import { DialogService } from '@core/dialog/dialog.service';
import { TranslocoDirective } from '@jsverse/transloco';
import { MenuItem } from '@pages/main-menu/menu-item';
import { SettingsComponent } from '@ui/components/settings/settings.component';
import { SIGN_IN_DIALOG_OPTIONS, SignInComponent } from '@ui/components/sign-in/sign-in.component';
import { MenuItemsListComponent } from './menu-items-list/menu-items-list.component';

@Component({
  selector: 'ah-main-menu',
  imports: [MenuItemsListComponent, SettingsComponent, DialogComponent, TranslocoDirective],
  templateUrl: './main-menu.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'h-screen w-screen flex items-center bg-[url("/assets/images/main-menu.webp")] bg-cover bg-center bg-no-repeat bg-black',
  },
})
export class MainMenuComponent {
  private readonly authService = inject(AuthService);
  private readonly dialogService = inject(DialogService);
  private readonly currentUser = toSignal(this.authService.currentUser);
  private readonly settingsDialog = viewChild.required<DialogComponent>('settings');

  protected readonly mainItems: Signal<MenuItem[]> = computed(() => {
    const isAuthenticated = this.currentUser() !== undefined;
    return [
      this.createContinueButton(isAuthenticated),
      this.createNewGameButton(),
      this.createLoadGameButton(isAuthenticated),
      this.createDecksButton(),
      this.createSettingsButton(),
    ];
  });

  private createContinueButton(isAuthenticated: boolean) {
    return isAuthenticated
      ? {
          name: 'continue',
          tooltip: 'Night of the Zealot\nScenario 1 — The Gathering',
          process: () => {
            alert('continue');
          },
        }
      : {
          name: 'login_to_continue',
          process: () => {
            this.signIn();
          },
        };
  }

  /**
   * No subscription: `DialogService.open` creates and opens the dialog eagerly, and both sign-in
   * paths refresh `AuthService.currentUser` themselves — so `mainItems` swaps this entry for
   * "continue" on its own. There is nothing left for a result handler to do.
   */
  private signIn() {
    this.dialogService.open(SignInComponent, SIGN_IN_DIALOG_OPTIONS);
  }

  private createNewGameButton() {
    return {
      name: 'new_game',
      process: () => {
        alert('new game');
      },
    };
  }

  private createLoadGameButton(isAuthenticated: boolean) {
    return {
      name: 'load_game',
      disabled: !isAuthenticated,
      process: () => {
        alert('load game');
      },
    };
  }

  private createDecksButton() {
    return {
      name: 'decks',
      process: () => {
        alert('decks');
      },
    };
  }

  private createSettingsButton() {
    return {
      name: 'settings',
      process: () => {
        this.settingsDialog().open();
      },
    };
  }
}
