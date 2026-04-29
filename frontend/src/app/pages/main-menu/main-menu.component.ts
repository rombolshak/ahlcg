import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  Signal,
  viewChild,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { MenuItem } from '@pages/main-menu/menu-item';
import { AuthService } from '@services/auth.service';
import { MenuItemsListComponent } from './menu-items-list/menu-items-list.component';
import { SettingsComponent } from "@shared/components/settings/settings.component";

@Component({
  selector: 'ah-main-menu',
  imports: [MenuItemsListComponent, SettingsComponent],
  templateUrl: './main-menu.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class:
      'h-screen w-screen flex items-center bg-[url("/assets/images/main-menu.webp")] bg-cover bg-center bg-no-repeat bg-black',
  },
})
export class MainMenuComponent {
  private readonly authService = inject(AuthService);
  private readonly currentUser = toSignal(this.authService.currentUser);
  private readonly settingsDialog = viewChild.required<SettingsComponent>('settings');

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
            alert('login');
          },
        };
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
        this.settingsDialog().openSettings();
      },
    };
  }
}
