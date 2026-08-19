import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { DisplayOptions } from '@domain/display.options';
import { CardInfo } from '@domain/entities/details/card-info.model';
import { EventCard } from '@domain/entities/player-card.model';
import { CardAbilitiesComponent } from '../card-parts/card-abilities/card-abilities.component';
import { CardCopyrightComponent } from '../card-parts/card-copyright/card-copyright.component';
import { CardCostComponent } from '../card-parts/card-cost/card-cost.component';
import { CardFlavorComponent } from '../card-parts/card-flavor/card-flavor.component';
import { PlayerCardComponent } from '../card-parts/card-player-base/player-card.component';
import { CardTitleComponent } from '../card-parts/card-title/card-title.component';
import { CardTraitsComponent } from '../card-parts/card-traits/card-traits.component';

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
  readonly cardInfo = input.required<CardInfo>();
  readonly displayOptions = input.required<DisplayOptions>();
}
