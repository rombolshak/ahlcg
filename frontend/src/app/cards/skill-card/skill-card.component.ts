import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { SkillCard } from '../../models/player-card.model';
import { CardAbilitiesComponent } from '../../card-parts/card-abilities/card-abilities.component';
import { CardCopyrightComponent } from '../../card-parts/card-copyright/card-copyright.component';
import { CardCostComponent } from '../../card-parts/card-cost/card-cost.component';
import { CardFlavorComponent } from '../../card-parts/card-flavor/card-flavor.component';
import { PlayerCardComponent } from '../../card-parts/card-player-base/player-card.component';
import { CardTitleComponent } from '../../card-parts/card-title/card-title.component';
import { CardTraitsComponent } from '../../card-parts/card-traits/card-traits.component';
import { DisplayOptions } from '../../models/display.options';

@Component({
  selector: 'ah-skill-card',
  standalone: true,
  imports: [
    CardAbilitiesComponent,
    CardCopyrightComponent,
    CardCostComponent,
    CardFlavorComponent,
    PlayerCardComponent,
    CardTitleComponent,
    CardTraitsComponent,
  ],
  templateUrl: './skill-card.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SkillCardComponent {
  card = input.required<SkillCard>();
  displayOptions = input.required<DisplayOptions>();
}
