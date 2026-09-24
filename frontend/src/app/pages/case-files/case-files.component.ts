import { ChangeDetectionStrategy, Component, computed, effect, ElementRef, inject, OnDestroy, OnInit, signal, viewChildren } from '@angular/core';
import { rxResource, toSignal } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { AuthService } from '@core/auth/auth.service';
import { ScopedTranslocoDirective } from '@core/i18n/scoped-transloco.directive';
import { InputLayer, InputManagerService, LayerRef } from '@core/input-manager.service';
import { listNavigation } from '@core/list-navigation';
import { GamesService, GameSummary } from '@features/games/games.service';
import { ArtButtonComponent } from '@ui/kit/art-button/art-button.component';
import { CaseFileCardComponent } from './case-file-card/case-file-card.component';
import { CaseFilesNoticeComponent } from './case-files-notice/case-files-notice.component';
import { I18N_SCOPE } from './i18n/scope';

type Tab = 'recent' | 'archive';

const TAB_BASE_CLASS = 'border-b-2 outline-hidden px-6 pt-1 pb-2 font-[Conkordia] text-[24px] tracking-wide';
const ACTIVE_TAB_CLASS = `${TAB_BASE_CLASS} border-[oklch(0.74_0.14_70)] text-base-content`;
const INACTIVE_TAB_CLASS = `${TAB_BASE_CLASS} border-transparent text-base-content/55`;

@Component({
  selector: 'ah-case-files',
  imports: [ArtButtonComponent, CaseFileCardComponent, CaseFilesNoticeComponent, ScopedTranslocoDirective],
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

  protected readonly scope = I18N_SCOPE;

  private readonly currentUser = toSignal(this.authService.currentUser);

  protected readonly tab = signal<Tab>('recent');
  private readonly archiveRequested = signal(false);

  private readonly recentResource = rxResource({
    params: () => this.currentUser(),
    stream: () => this.games.recent(),
  });
  private readonly archiveResource = rxResource({
    params: () => (this.archiveRequested() ? this.currentUser() : undefined),
    stream: () => this.games.archive(),
  });

  private readonly activeResource = computed(() => (this.tab() === 'recent' ? this.recentResource : this.archiveResource));

  protected readonly isLoading = computed(() => this.activeResource().isLoading());
  protected readonly hasFailed = computed(() => this.activeResource().status() === 'error');
  protected readonly entries = computed(() => {
    const resource = this.activeResource();
    return resource.hasValue() ? resource.value() : [];
  });

  private readonly recentEntries = computed(() => (this.recentResource.hasValue() ? this.recentResource.value() : []));
  private readonly archiveEntries = computed(() => (this.archiveResource.hasValue() ? this.archiveResource.value() : []));

  private readonly recentNavigation = listNavigation({
    items: this.recentEntries,
    onConfirm: game => {
      this.open(game);
    },
  });
  private readonly archiveNavigation = listNavigation({
    items: this.archiveEntries,
    onConfirm: game => {
      this.open(game);
    },
  });
  protected readonly navigation = computed(() => (this.tab() === 'recent' ? this.recentNavigation : this.archiveNavigation));

  protected readonly recentTabClass = computed(() => (this.tab() === 'recent' ? ACTIVE_TAB_CLASS : INACTIVE_TAB_CLASS));
  protected readonly archiveTabClass = computed(() => (this.tab() === 'archive' ? ACTIVE_TAB_CLASS : INACTIVE_TAB_CLASS));

  private readonly cards = viewChildren<CaseFileCardComponent, ElementRef<HTMLElement>>(CaseFileCardComponent, { read: ElementRef });

  private inputLayer: LayerRef | undefined;

  constructor() {
    effect(() => {
      this.cards()[this.navigation().selectedIndex()]?.nativeElement.scrollIntoView({ block: 'nearest' });
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

  protected retry(): void {
    this.activeResource().reload();
  }

  protected open(game: GameSummary): void {
    void this.router.navigate(['/game', game.id]);
  }

  protected selectTab(tab: Tab): void {
    this.tab.set(tab);
    if (tab === 'archive') this.archiveRequested.set(true);
  }

  private buildInputLayer(): InputLayer {
    const cancel = () => {
      this.goBack();
    };
    const tabHandlers: InputLayer = {
      moveLeft: () => {
        this.selectTab('recent');
      },
      moveRight: () => {
        this.selectTab('archive');
      },
    };

    if (this.hasFailed()) {
      return {
        cancel,
        confirm: () => {
          this.retry();
        },
        ...tabHandlers,
      };
    }

    if (!this.isLoading() && this.entries().length === 0) {
      return { cancel, confirm: cancel, ...tabHandlers };
    }

    if (!this.isLoading()) {
      return { cancel, ...this.navigation().handlers, ...tabHandlers };
    }

    return { cancel, ...tabHandlers };
  }
}
