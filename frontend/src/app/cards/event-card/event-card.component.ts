import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { EventCard } from '../../models/player-card.model';
import { NgOptimizedImage } from '@angular/common';
import { TrimStartPipe } from '../../pipes/trim-start.pipe';
import { WithAhSymbolsPipe } from '../../pipes/with-ah-symbols.pipe';
import { CardCopyrightComponent } from '../../card-parts/card-copyright/card-copyright.component';
import { CardFlavorComponent } from '../../card-parts/card-flavor/card-flavor.component';
import { CardTraitsComponent } from '../../card-parts/card-traits/card-traits.component';
import { CardAbilitiesComponent } from '../../card-parts/card-abilities/card-abilities.component';
import { CardTitleComponent } from '../../card-parts/card-title/card-title.component';
import { CardSkillsComponent } from '../../card-parts/card-skills/card-skills.component';
import { CardCostComponent } from '../../card-parts/card-cost/card-cost.component';
import { CardPlayerBaseComponent } from '../../card-parts/card-player-base/card-player-base.component';

@Component({
  selector: 'ah-event-card',
  standalone: true,
  imports: [
    NgOptimizedImage,
    TrimStartPipe,
    WithAhSymbolsPipe,
    CardCopyrightComponent,
    CardFlavorComponent,
    CardTraitsComponent,
    CardAbilitiesComponent,
    CardTitleComponent,
    CardSkillsComponent,
    CardCostComponent,
    CardPlayerBaseComponent
  ],
  templateUrl: './event-card.component.html',
  styles: `:host {
  @apply relative block w-card h-card;
  }`,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class EventCardComponent {

  card = input.required<EventCard>();
}