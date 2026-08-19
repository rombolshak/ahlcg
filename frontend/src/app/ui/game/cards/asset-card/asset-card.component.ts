import { NgOptimizedImage } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { CardInfoService } from '@core/card-info.service';
import { imageUrl } from '@domain/card-art/image-url';
import { DisplayOptions } from '@domain/display.options';
import { AssetCard } from '@domain/entities/player-card.model';
import { CardAbilitiesComponent } from '../card-parts/card-abilities/card-abilities.component';
import { CardCopyrightComponent } from '../card-parts/card-copyright/card-copyright.component';
import { CardCostComponent } from '../card-parts/card-cost/card-cost.component';
import { PlayerCardComponent } from '../card-parts/card-player-base/player-card.component';
import { CardTitleComponent } from '../card-parts/card-title/card-title.component';
import { CardTraitsComponent } from '../card-parts/card-traits/card-traits.component';

@Component({
  selector: 'ah-asset-card',
  imports: [NgOptimizedImage, PlayerCardComponent, CardCostComponent, CardTitleComponent, CardTraitsComponent, CardAbilitiesComponent, CardCopyrightComponent],
  templateUrl: './asset-card.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AssetCardComponent {
  private readonly cardInfoService = inject(CardInfoService);
  protected readonly imageUrl = imageUrl;

  readonly card = input.required<AssetCard>();
  readonly displayOptions = input.required<DisplayOptions>();

  readonly cardInfo = this.cardInfoService.getCardInfo(this.card);
  slotSizes = {
    l: 64,
    m: 43,
    s: 21,
  };
}
