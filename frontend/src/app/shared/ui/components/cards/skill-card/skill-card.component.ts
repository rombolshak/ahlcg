import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { DisplayOptions } from '@domain/display.options';
import { SkillCard } from '@domain/entities/player-card.model';
import { CardInfoService } from '@services/card-info.service';
import { CardAbilitiesComponent } from '../card-parts/card-abilities/card-abilities.component';
import { CardCopyrightComponent } from '../card-parts/card-copyright/card-copyright.component';
import { CardFlavorComponent } from '../card-parts/card-flavor/card-flavor.component';
import { PlayerCardComponent } from '../card-parts/card-player-base/player-card.component';
import { CardTitleComponent } from '../card-parts/card-title/card-title.component';
import { CardTraitsComponent } from '../card-parts/card-traits/card-traits.component';

@Component({
  selector: 'ah-skill-card',
  imports: [CardAbilitiesComponent, CardCopyrightComponent, CardFlavorComponent, PlayerCardComponent, CardTitleComponent, CardTraitsComponent],
  templateUrl: './skill-card.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SkillCardComponent {
  private readonly cardInfoService = inject(CardInfoService);

  readonly card = input.required<SkillCard>();
  readonly displayOptions = input.required<DisplayOptions>();

  readonly cardInfo = this.cardInfoService.getCardInfo(this.card);
}
