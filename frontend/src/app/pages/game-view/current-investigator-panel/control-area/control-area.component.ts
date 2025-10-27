import {
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  inject,
  input,
  linkedSignal,
  OnDestroy,
  OnInit,
  signal,
} from '@angular/core';
import { CardFactionBackgroundDirective } from '@shared/directives/card-faction-background.directive';
import { AssetsListComponent } from 'pages/game-view/current-investigator-panel/control-area/active-assets-list/assets-list.component';
import {
  AssetCard,
  assetSlot,
  AssetSlot,
  Faction,
  SlotsCount,
} from 'shared/domain/entities/player-card.model';
import { ImagesUrlService } from 'shared/services/images-url.service';
import { EmptySlotsListComponent } from './empty-slots-list/empty-slots-list.component';
import {
  emptySlots,
  getTotalPages,
  isActive,
  sliceActiveAssets,
  slicePassiveAssets,
} from './utils';

@Component({
  selector: 'ah-control-area',
  imports: [AssetsListComponent, EmptySlotsListComponent],
  templateUrl: './control-area.component.html',
  // eslint-disable-next-line @angular-eslint/component-max-inline-declarations
  styles: `
    :host {
      .btn-active {
        background: var(--color-secondary);
      }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class:
      'flex-1 min-h-0 flex flex-col justify-end gap-3 p-4 outline outline-2 outline-gray-600 rounded relative',
  },
  hostDirectives: [
    { directive: CardFactionBackgroundDirective, inputs: ['faction'] },
  ],
})
export class ControlAreaComponent implements OnInit, OnDestroy {
  readonly faction = input.required<Faction>();
  readonly assets = input.required<AssetCard[]>();
  readonly maxSlotsCounts = input.required<SlotsCount>();

  protected readonly imagesService = inject(ImagesUrlService);

  private readonly element = inject(ElementRef);
  private readonly observer = new ResizeObserver((entries) => {
    this.resize(entries);
  });
  private readonly availableHeight = signal(0);

  ngOnInit() {
    this.observer.observe(this.element.nativeElement as HTMLElement);
  }

  ngOnDestroy() {
    this.observer.disconnect();
  }

  protected readonly emptySlots = computed(() =>
    Object.entries(emptySlots(this.assets(), this.maxSlotsCounts()))
      .filter(([, count]) => count > 0)
      .flatMap(([slot, count]) =>
        new Array<AssetSlot>(count).fill(assetSlot.assert(slot)),
      ),
  );

  protected readonly showPager = computed(() => {
    return this.totalPages() > 1;
  });

  protected readonly currentPage = linkedSignal<number, number>({
    source: () => this.totalPages(),
    computation: (total, previous) => {
      return Math.min(total - 1, previous?.value ?? 0);
    },
  });
  protected readonly totalPages = computed(() =>
    getTotalPages(
      this.activeAssets().length,
      this.passiveAssets().length,
      this.availableHeight(),
    ),
  );

  protected readonly activeAssetsToDisplay = computed(() => {
    const slice = sliceActiveAssets(this.currentPage(), this.availableHeight());
    return this.activeAssets().slice(slice.start, slice.end);
  });

  protected readonly passiveAssetsToDisplay = computed(() => {
    const slice = slicePassiveAssets(
      this.activeAssets().length,
      this.currentPage(),
      this.availableHeight(),
    );
    return this.passiveAssets().slice(slice.start, slice.end);
  });

  private readonly activeAssets = computed(() =>
    this.assets().filter((a) => isActive(a)),
  );

  private readonly passiveAssets = computed(() =>
    this.assets().filter((a) => !isActive(a)),
  );

  private resize(entries: ResizeObserverEntry[]) {
    entries.forEach((entry) => {
      if (entry.target === (this.element.nativeElement as HTMLElement)) {
        this.availableHeight.set(entry.contentBoxSize[0]?.blockSize ?? 0);
      }
    });
  }
}
