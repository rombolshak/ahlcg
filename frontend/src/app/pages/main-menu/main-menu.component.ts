import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, DestroyRef, inject, Signal, signal, viewChild } from '@angular/core';
import { rxResource, takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { AuthService } from '@core/auth/auth.service';
import { AlertDialogService } from '@core/dialog/alert/alert-dialog.service';
import { DialogComponent } from '@core/dialog/dialog.component';
import { DialogService } from '@core/dialog/dialog.service';
import { SIGN_IN_DIALOG_OPTIONS, SignInComponent } from '@features/auth/sign-in/sign-in.component';
import { GamesService } from '@features/games/games.service';
import { SettingsComponent } from '@features/settings/settings.component';
import { TranslocoService } from '@jsverse/transloco';
import { MenuItem } from '@pages/main-menu/menu-item';
import { finalize } from 'rxjs';
import { MenuItemsListComponent } from './menu-items-list/menu-items-list.component';

const MAIN_MENU_I18N_SCOPE = 'pages/main-menu';

@Component({
  selector: 'ah-main-menu',
  imports: [MenuItemsListComponent, SettingsComponent, DialogComponent],
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
  private readonly transloco = inject(TranslocoService);
  private readonly currentUser = toSignal(this.authService.currentUser);
  private readonly activeLang = toSignal(this.transloco.langChanges$, { initialValue: this.transloco.getActiveLang() });
  private readonly settingsDialog = viewChild.required<DialogComponent>('settings');

  private readonly latestGame = rxResource({
    params: () => this.currentUser(),
    stream: () => this.games.latest(),
  });

  private readonly creatingGame = signal(false);
  private newGameIdempotencyKey: string | undefined;

  protected readonly mainItems: Signal<MenuItem[]> = computed(() => {
    const isAuthenticated = this.currentUser() !== undefined;
    const items: MenuItem[] = [
      this.createContinueButton(isAuthenticated),
      this.createNewGameButton(),
      this.createLoadGameButton(),
      this.createDecksButton(),
      this.createSettingsButton(),
    ];

    // The busy item keeps its enabled flag so keyboard selection stays on the spinner rather than
    // landing nowhere — `newGame()`'s own guard is what stops it being re-activated.
    if (!this.creatingGame()) return items;
    return items.map(item => (item.busy === true ? item : { ...item, disabled: true }));
  });

  private createContinueButton(isAuthenticated: boolean): MenuItem {
    if (!isAuthenticated) {
      return {
        name: 'login_to_continue',
        process: () => {
          this.signIn();
        },
      };
    }

    if (!this.latestGame.hasValue()) {
      return {
        name: 'continue',
        disabled: true,
        process: () => {
          /* empty */
        },
      };
    }

    const game = this.latestGame.value();
    const lastPlayed = new Intl.DateTimeFormat(this.activeLang(), { dateStyle: 'medium', timeStyle: 'short' }).format(game.lastPlayedAt);

    return {
      name: 'continue',
      tooltip: { key: 'continue_tooltip', params: { lastPlayed } },
      process: () => {
        void this.router.navigate(['/game', game.id]);
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
    this.alertDialog.alert({
      title: this.transloco.translate('new_game_error.title', {}, MAIN_MENU_I18N_SCOPE),
      message: this.transloco.translate('new_game_error.message', {}, MAIN_MENU_I18N_SCOPE),
    });
  }

  /**
   * Enabled while signed out too: the list request 401s, `authInterceptor` prompts and replays it,
   * and a dismissal surfaces the 401 into the page's own error state.
   */
  private createLoadGameButton() {
    return {
      name: 'load_game',
      process: () => {
        void this.router.navigate(['/case-files']);
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
