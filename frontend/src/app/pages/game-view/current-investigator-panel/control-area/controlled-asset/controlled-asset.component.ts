import { NgOptimizedImage } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
} from '@angular/core';
import { AssetCard } from 'shared/domain/entities/player-card.model';
import { ImagesUrlService } from 'shared/services/images-url.service';
import { VitalsBarComponent } from 'shared/ui/components/vitals-bar/vitals-bar.component';
import { CardInfoService } from '../../../../../shared/services/card-info.service';
import { WithAhSymbolsPipe } from '../../../../../shared/ui/pipes/with-ah-symbols.pipe';
import { AssetDetailIconComponent } from './asset-detail-icon/asset-detail-icon.component';
import { AssetPopoverComponent } from './asset-popover/asset-popover.component';

@Component({
  selector: 'ah-controlled-asset',
  imports: [
    NgOptimizedImage,
    VitalsBarComponent,
    AssetDetailIconComponent,
    AssetPopoverComponent,
    WithAhSymbolsPipe,
  ],
  templateUrl: './controlled-asset.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'group relative flex gap-1 justify-between anchor/(--anchor-name)',
    '[class.p-1]': '!passive()',
    '[style.--anchor-name]': 'anchorName()',
  },
})
export class ControlledAssetComponent {
  readonly asset = input.required<AssetCard>();
  readonly passive = input<boolean>(false);
  readonly hovered = input<boolean>(false);
  protected readonly imagesService = inject(ImagesUrlService);
  protected readonly info = inject(CardInfoService).getCardInfo(this.asset);
  protected readonly anchorName = computed(() => `--asset-${this.asset().id}`);
}
