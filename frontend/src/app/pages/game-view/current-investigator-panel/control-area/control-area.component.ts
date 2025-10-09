import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
} from '@angular/core';
import {
  AssetCard,
  assetSlot,
  AssetSlot,
  Faction,
  SlotsCount,
} from 'shared/domain/entities/player-card.model';
import { ImagesUrlService } from 'shared/services/images-url.service';
import { ActiveAssetsListComponent } from './active-assets-list/active-assets-list.component';
import { ControlledAssetComponent } from './controlled-asset/controlled-asset.component';
import { EmptySlotComponent } from './empty-slot/empty-slot.component';
import { EmptySlotsListComponent } from './empty-slots-list/empty-slots-list.component';
import { PassiveAssetsListComponent } from './passive-assets-list/passive-assets-list.component';
import { emptySlots, isActive } from './utils';

@Component({
  selector: 'ah-control-area',
  imports: [
    ControlledAssetComponent,
    EmptySlotComponent,
    PassiveAssetsListComponent,
    ActiveAssetsListComponent,
    EmptySlotsListComponent,
  ],
  templateUrl: './control-area.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class:
      'flex flex-col gap-3 p-4 -z-45 outline outline-2 outline-gray-600 rounded relative bg-(image:--bgUrl) bg-cover bg-center',
    '[style.--bgUrl]':
      "'url(' + imagesService.getUrl(['card-template', 'investigator', faction()]) + ')'",
  },
})
export class ControlAreaComponent {
  readonly faction = input.required<Faction>();
  readonly assets = input.required<AssetCard[]>();
  readonly maxSlotsCounts = input.required<SlotsCount>();

  protected readonly imagesService = inject(ImagesUrlService);

  protected readonly activeAssets = computed(() =>
    this.assets().filter((a) => isActive(a)),
  );

  protected readonly passiveAssets = computed(() =>
    this.assets().filter((a) => !isActive(a)),
  );

  protected readonly emptySlots = computed(() =>
    Object.entries(emptySlots(this.assets(), this.maxSlotsCounts()))
      .filter(([, count]) => count > 0)
      .flatMap(([slot, count]) =>
        new Array<AssetSlot>(count).fill(assetSlot.assert(slot)),
      ),
  );
}
