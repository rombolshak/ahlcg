import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
} from '@angular/core';
import { CreateOverlay, ImagesUrlService } from 'services/images-url.service';
import { NgOptimizedImage } from '@angular/common';
import { InvestigatorModel } from 'models/player-card.model';
import { AssetState } from 'models/asset.state';
import { CardOutlineDirective } from 'directives/card-outline.directive';
import { CardTitleComponent } from 'components/cards/card-parts/card-title/card-title.component';
import { CardSubtitleComponent } from 'components/cards/card-parts/card-subtitle/card-subtitle.component';
import { CardTraitsComponent } from 'components/cards/card-parts/card-traits/card-traits.component';
import { DisplayOptions } from 'models/display.options';
import { CardAbilitiesComponent } from 'components/cards/card-parts/card-abilities/card-abilities.component';
import { VitalsBarComponent } from 'components/vitals-bar/vitals-bar.component';

@Component({
  selector: 'ah-investigator',
  imports: [
    NgOptimizedImage,
    CardOutlineDirective,
    CardTitleComponent,
    CardSubtitleComponent,
    CardTraitsComponent,
    CardAbilitiesComponent,
    VitalsBarComponent,
  ],
  templateUrl: './investigator.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InvestigatorComponent {
  protected readonly imagesService = inject(ImagesUrlService);

  readonly baseModel = input.required<InvestigatorModel>();
  readonly assetState = input.required<AssetState>();
  protected readonly CreateOverlay = CreateOverlay;
  protected displayOptions: DisplayOptions = { cardSize: 's', textSize: 's' };
}
