import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
} from '@angular/core';
import { EventCard } from 'shared/domain/entities/player-card.model';
import { CardCopyrightComponent } from '../card-parts/card-copyright/card-copyright.component';
import { CardFlavorComponent } from '../card-parts/card-flavor/card-flavor.component';
import { CardTraitsComponent } from '../card-parts/card-traits/card-traits.component';
import { CardAbilitiesComponent } from '../card-parts/card-abilities/card-abilities.component';
import { CardTitleComponent } from '../card-parts/card-title/card-title.component';
import { CardCostComponent } from '../card-parts/card-cost/card-cost.component';
import { PlayerCardComponent } from '../card-parts/card-player-base/player-card.component';
import { DisplayOptions } from 'shared/domain/display.options';
import { CardInfoService } from 'shared/services/card-info.service';

@Component({
  selector: 'ah-event-card',
  imports: [
    CardCopyrightComponent,
    CardFlavorComponent,
    CardTraitsComponent,
    CardAbilitiesComponent,
    CardTitleComponent,
    CardCostComponent,
    PlayerCardComponent,
  ],
  templateUrl: './event-card.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EventCardComponent {
  readonly card = input.required<EventCard>();
  readonly cardInfo = inject(CardInfoService).getCardInfo(this.card);
  readonly displayOptions = input.required<DisplayOptions>();
}
