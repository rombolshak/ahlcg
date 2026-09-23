import { ChangeDetectionStrategy, Component, computed, effect, ElementRef, inject, OnDestroy, OnInit, viewChildren } from '@angular/core';
import { rxResource, toSignal } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { AuthService } from '@core/auth/auth.service';
import { ScopedTranslocoDirective } from '@core/i18n/scoped-transloco.directive';
import { InputLayer, InputManagerService, LayerRef } from '@core/input-manager.service';
import { listNavigation, NO_SELECTION } from '@core/list-navigation';
import { GamesService, GameSummary } from '@features/games/games.service';
import { ArtButtonComponent } from '@ui/kit/art-button/art-button.component';
import { CaseFileCardComponent } from './case-file-card/case-file-card.component';
import { CASE_FILES_I18N_SCOPE } from './i18n/scope';

@Component({
  selector: 'ah-case-files',
  imports: [ArtButtonComponent, CaseFileCardComponent, ScopedTranslocoDirective],
  templateUrl: './case-files.component.html',
  styles: '.case-files-scroll { scrollbar-width: thin; scrollbar-color: color-mix(in oklch, var(--color-base-content) 45%, transparent) transparent; }',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'relative h-screen w-screen flex justify-center bg-[url("/assets/images/main-menu.webp")] bg-cover bg-center bg-no-repeat bg-black',
  },
})
export class CaseFilesComponent implements OnInit, OnDestroy {
  private readonly authService = inject(AuthService);
  private readonly games = inject(GamesService);
  private readonly router = inject(Router);
  private readonly inputManager = inject(InputManagerService);

  protected readonly scope = CASE_FILES_I18N_SCOPE;

  private readonly currentUser = toSignal(this.authService.currentUser);

  private readonly gamesResource = rxResource({
    params: () => this.currentUser(),
    stream: () => this.games.list(),
  });

  protected readonly isLoading = this.gamesResource.isLoading;
  protected readonly hasFailed = computed(() => this.gamesResource.status() === 'error');
  protected readonly entries = computed(() => (this.gamesResource.hasValue() ? this.gamesResource.value() : []));

  private readonly navigation = listNavigation({
    items: this.entries,
    preselect: false,
    onConfirm: game => {
      this.open(game);
    },
  });
  protected readonly selectedIndex = this.navigation.selectedIndex;

  private readonly cards = viewChildren<CaseFileCardComponent, ElementRef<HTMLElement>>(CaseFileCardComponent, { read: ElementRef });

  private inputLayer: LayerRef | undefined;

  constructor() {
    effect(() => {
      this.cards()[this.selectedIndex()]?.nativeElement.scrollIntoView({ block: 'nearest' });
    });
  }

  public ngOnInit(): void {
    this.inputLayer = this.inputManager.pushLayer(() => this.buildInputLayer());
  }

  public ngOnDestroy(): void {
    this.inputLayer?.destroy();
  }

  protected goBack(): void {
    void this.router.navigate(['/']);
  }

  protected clearSelection(): void {
    this.selectedIndex.set(NO_SELECTION);
  }

  protected retry(): void {
    this.gamesResource.reload();
  }

  protected open(game: GameSummary): void {
    void this.router.navigate(['/game', game.id]);
  }

  private buildInputLayer(): InputLayer {
    const cancel = () => {
      this.goBack();
    };

    if (this.hasFailed()) {
      return {
        cancel,
        confirm: () => {
          this.retry();
        },
      };
    }

    if (!this.isLoading() && this.entries().length === 0) {
      return { cancel, confirm: cancel };
    }

    if (!this.isLoading()) {
      return { cancel, ...this.navigation.handlers };
    }

    return { cancel };
  }
}
