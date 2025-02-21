import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
} from '@angular/core';
import {
  CreateOverlay,
  ImagesUrlService,
} from 'shared/services/images-url.service';
import { NgOptimizedImage } from '@angular/common';
import { InvestigatorWithState } from 'shared/domain/investigator.model';
import { CardTitleComponent } from 'shared/ui/components/cards/card-parts/card-title/card-title.component';
import { CardSubtitleComponent } from 'shared/ui/components/cards/card-parts/card-subtitle/card-subtitle.component';
import { CardTraitsComponent } from 'shared/ui/components/cards/card-parts/card-traits/card-traits.component';
import { DisplayOptions } from 'shared/domain/display.options';
import { CardAbilitiesComponent } from 'shared/ui/components/cards/card-parts/card-abilities/card-abilities.component';
import { EntityAvatarComponent } from '../entity-avatar/entity-avatar.component';

@Component({
  selector: 'ah-investigator',
  imports: [
    NgOptimizedImage,
    CardTitleComponent,
    CardSubtitleComponent,
    CardTraitsComponent,
    CardAbilitiesComponent,
    EntityAvatarComponent,
  ],
  templateUrl: './investigator.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InvestigatorComponent {
  protected readonly imagesService = inject(ImagesUrlService);

  readonly investigator = input.required<InvestigatorWithState>();
  protected readonly CreateOverlay = CreateOverlay;
  protected displayOptions: DisplayOptions = { cardSize: 's', textSize: 's' };
}
