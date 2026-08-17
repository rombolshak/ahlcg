import { NgOptimizedImage } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { CardInfoService } from '@core/card-info.service';
import { ImagesUrlService } from '@core/images-url.service';
import { AssetCard } from '@domain/entities/player-card.model';
import { VitalsBarComponent } from '@ui/components/vitals-bar/vitals-bar.component';
import { WithAhSymbolsPipe } from '@ui/pipes/with-ah-symbols.pipe';
import { AssetDetailIconComponent } from './asset-detail-icon/asset-detail-icon.component';
import { AssetPopoverComponent } from './asset-popover/asset-popover.component';

@Component({
  selector: 'ah-controlled-asset',
  imports: [NgOptimizedImage, VitalsBarComponent, AssetDetailIconComponent, AssetPopoverComponent, WithAhSymbolsPipe],
  templateUrl: './controlled-asset.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'group relative flex gap-1 justify-between anchor/(--anchor-name)',
    '[class.p-1]': '!passive()',
    '[style.--anchor-name]': 'anchorName()',
  },
})
export class ControlledAssetComponent {
  protected readonly imagesService = inject(ImagesUrlService);
  private readonly cardInfoService = inject(CardInfoService);

  readonly asset = input.required<AssetCard>();
  readonly passive = input(false);
  readonly hovered = input(false);

  protected readonly info = this.cardInfoService.getCardInfo(this.asset);
  protected readonly anchorName = computed(() => `--asset-${this.asset().id}`);
}
