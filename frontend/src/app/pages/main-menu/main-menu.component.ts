import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, DestroyRef, inject, Signal, signal, viewChild } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { AuthService } from '@core/auth/auth.service';
import { AlertDialogService } from '@core/dialog/alert/alert-dialog.service';
import { DialogComponent } from '@core/dialog/dialog.component';
import { DialogService } from '@core/dialog/dialog.service';
import { SIGN_IN_DIALOG_OPTIONS, SignInComponent } from '@features/auth/sign-in/sign-in.component';
import { GamesService } from '@features/games/games.service';
import { SettingsComponent } from '@features/settings/settings.component';
import { TranslocoDirective } from '@jsverse/transloco';
import { MenuItem } from '@pages/main-menu/menu-item';
import { finalize } from 'rxjs';
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
  private readonly games = inject(GamesService);
  private readonly router = inject(Router);
  private readonly alertDialog = inject(AlertDialogService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly currentUser = toSignal(this.authService.currentUser);
  private readonly settingsDialog = viewChild.required<DialogComponent>('settings');

  private readonly creatingGame = signal(false);
  private newGameIdempotencyKey: string | undefined;

  protected readonly mainItems: Signal<MenuItem[]> = computed(() => {
    const isAuthenticated = this.currentUser() !== undefined;
    const items: MenuItem[] = [
      this.createContinueButton(isAuthenticated),
      this.createNewGameButton(),
      this.createLoadGameButton(isAuthenticated),
      this.createDecksButton(),
      this.createSettingsButton(),
    ];

    // The busy item keeps its enabled flag so keyboard selection stays on the spinner rather than
    // landing nowhere — `newGame()`'s own guard is what stops it being re-activated.
    if (!this.creatingGame()) return items;
    return items.map(item => (item.busy === true ? item : { ...item, disabled: true }));
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

  private createNewGameButton(): MenuItem {
    return {
      name: 'new_game',
      busy: this.creatingGame(),
      process: () => {
        this.newGame();
      },
    };
  }

  private newGame(): void {
    if (this.creatingGame()) return;

    const idempotencyKey = (this.newGameIdempotencyKey ??= crypto.randomUUID());
    this.creatingGame.set(true);

    this.games
      .create({}, idempotencyKey)
      .pipe(
        finalize(() => {
          this.creatingGame.set(false);
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: game => {
          this.openCreatedGame(game.id);
        },
        // A 401 has already been through `authInterceptor`, which opens the sign-in prompt and
        // replays the request — reaching here means the user dismissed it, not that anything failed.
        error: (err: unknown) => {
          if (err instanceof HttpErrorResponse && err.status === 401) return;

          this.showCreateError();
        },
      });
  }

  /**
   * The key outlives a navigation that did not land, so the next activation reuses it and the
   * server returns the game already created instead of a second one.
   */
  private openCreatedGame(id: string): void {
    void this.router.navigate(['/game', id]).then(
      navigated => {
        if (navigated) this.newGameIdempotencyKey = undefined;
      },
      () => {
        this.showCreateError();
      },
    );
  }

  private showCreateError(): void {
    this.alertDialog.alert({ titleKey: 'main_menu.new_game_error.title', messageKey: 'main_menu.new_game_error.message' });
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
