import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { SkillCard } from '../../models/player-card.model';
import { CardAbilitiesComponent } from '../../card-parts/card-abilities/card-abilities.component';
import { CardCopyrightComponent } from '../../card-parts/card-copyright/card-copyright.component';
import { CardCostComponent } from '../../card-parts/card-cost/card-cost.component';
import { CardFlavorComponent } from '../../card-parts/card-flavor/card-flavor.component';
import { CardPlayerBaseComponent } from '../../card-parts/card-player-base/card-player-base.component';
import { CardTitleComponent } from '../../card-parts/card-title/card-title.component';
import { CardTraitsComponent } from '../../card-parts/card-traits/card-traits.component';

@Component({
  selector: 'ah-skill-card',
  standalone: true,
  imports: [
    CardAbilitiesComponent,
    CardCopyrightComponent,
    CardCostComponent,
    CardFlavorComponent,
    CardPlayerBaseComponent,
    CardTitleComponent,
    CardTraitsComponent
  ],
  templateUrl: './skill-card.component.html',
  styles: `:host {
  @apply relative block w-card h-card;
  }`,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SkillCardComponent {
  card = input.required<SkillCard>();
}
