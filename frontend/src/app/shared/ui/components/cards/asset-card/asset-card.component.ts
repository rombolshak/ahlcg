import { NgOptimizedImage } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
} from '@angular/core';
import { DisplayOptions } from 'shared/domain/display.options';
import { AssetCard } from 'shared/domain/entities/player-card.model';
import { CardInfoService } from 'shared/services/card-info.service';
import { ImagesUrlService } from 'shared/services/images-url.service';
import { CardAbilitiesComponent } from '../card-parts/card-abilities/card-abilities.component';
import { CardCopyrightComponent } from '../card-parts/card-copyright/card-copyright.component';
import { CardCostComponent } from '../card-parts/card-cost/card-cost.component';
import { PlayerCardComponent } from '../card-parts/card-player-base/player-card.component';
import { CardTitleComponent } from '../card-parts/card-title/card-title.component';
import { CardTraitsComponent } from '../card-parts/card-traits/card-traits.component';

@Component({
  selector: 'ah-asset-card',
  imports: [
    NgOptimizedImage,
    PlayerCardComponent,
    CardCostComponent,
    CardTitleComponent,
    CardTraitsComponent,
    CardAbilitiesComponent,
    CardCopyrightComponent,
  ],
  templateUrl: './asset-card.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AssetCardComponent {
  readonly card = input.required<AssetCard>();
  imagesService = inject(ImagesUrlService);
  readonly cardInfo = inject(CardInfoService).getCardInfo(this.card);
  readonly displayOptions = input.required<DisplayOptions>();
  slotSizes = {
    l: 64,
    m: 43,
    s: 21,
  };
}
