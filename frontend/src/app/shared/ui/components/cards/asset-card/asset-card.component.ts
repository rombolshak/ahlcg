import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { NgOptimizedImage } from '@angular/common';
import {
  ImagesUrlService,
  CreateOverlay,
} from 'shared/services/images-url.service';
import { AssetCard } from 'shared/domain/player-card.model';
import { PlayerCardComponent } from '../card-parts/card-player-base/player-card.component';
import { CardCostComponent } from '../card-parts/card-cost/card-cost.component';
import { CardTitleComponent } from '../card-parts/card-title/card-title.component';
import { CardTraitsComponent } from '../card-parts/card-traits/card-traits.component';
import { CardAbilitiesComponent } from '../card-parts/card-abilities/card-abilities.component';
import { CardCopyrightComponent } from '../card-parts/card-copyright/card-copyright.component';
import { DisplayOptions } from 'shared/domain/display.options';

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
  constructor(public imagesService: ImagesUrlService) {}

  readonly card = input.required<AssetCard>();
  readonly displayOptions = input.required<DisplayOptions>();
  slotSizes = {
    l: 64,
    m: 43,
    s: 21,
  };

  protected readonly CreateOverlay = CreateOverlay;
}
