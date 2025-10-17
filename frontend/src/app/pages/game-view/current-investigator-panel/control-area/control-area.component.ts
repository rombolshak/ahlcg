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
import { emptySlots, isActive } from './utils';

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
      'min-h-0 flex flex-col justify-end gap-3 p-4 -z-45 outline outline-2 outline-gray-600 rounded relative',
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
    Math.ceil(this.totalNeededRows() / this.availableRows()),
  );

  protected readonly activeAssetsToDisplay = computed(() => {
    const start = this.currentPage() * this.pageSize();
    return this.activeAssets().slice(start, start + this.pageSize());
  });

  protected readonly passiveAssetsToDisplay = computed(() => {
    const firstPageIndex = Math.floor(
      this.activeAssets().length / this.pageSize(),
    );
    if (this.currentPage() < firstPageIndex) return [];

    const firstPageSize =
      (this.pageSize() - (this.activeAssets().length % this.pageSize())) * 4;
    if (this.currentPage() === firstPageIndex)
      return this.passiveAssets().slice(0, firstPageSize);
    const start =
      firstPageSize +
      (this.currentPage() - firstPageIndex) * this.pageSize() * 4;
    return this.passiveAssets().slice(start, start + this.pageSize() * 4);
  });

  private readonly activeAssets = computed(() =>
    this.assets().filter((a) => isActive(a)),
  );

  private readonly passiveAssets = computed(() =>
    this.assets().filter((a) => !isActive(a)),
  );

  private readonly totalNeededRows = computed(() => {
    return Math.ceil(
      (this.activeAssets().length +
        Math.ceil(this.passiveAssets().length / 4)) /
        3,
    );
  });

  private readonly availableRows = computed(() => {
    const pagerHeight = 42;
    const rowHeight = 5.5 * 16;
    const gap = 3 * 4;
    return Math.max(
      Math.floor(
        (this.availableHeight() - pagerHeight + gap) / (rowHeight + gap),
      ),
      1,
    );
  });

  private readonly pageSize = computed(() => this.availableRows() * 3);

  private resize(entries: ResizeObserverEntry[]) {
    entries.forEach((entry) => {
      if (entry.target === (this.element.nativeElement as HTMLElement)) {
        this.availableHeight.set(entry.contentBoxSize[0]?.blockSize ?? 0);
      }
    });
  }
}
