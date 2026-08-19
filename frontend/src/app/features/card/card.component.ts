import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { CardInfoService } from '@core/card-info.service';
import { DisplayOptions } from '@domain/display.options';
import { AssetCard, EventCard, PlayerCard, SkillCard } from '@domain/entities/player-card.model';
import { AssetCardComponent } from '@ui/game/cards/asset-card/asset-card.component';
import { EventCardComponent } from '@ui/game/cards/event-card/event-card.component';
import { SkillCardComponent } from '@ui/game/cards/skill-card/skill-card.component';
import { AsPipe } from '@ui/pipes/as.pipe';

@Component({
  selector: 'ah-card',
  imports: [AsPipe, AssetCardComponent, EventCardComponent, SkillCardComponent],
  templateUrl: './card.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CardComponent {
  private readonly cardInfoService = inject(CardInfoService);

  readonly card = input.required<PlayerCard>();
  readonly displayOptions = input.required<DisplayOptions>();

  protected readonly cardInfo = this.cardInfoService.getCardInfo(this.card);

  protected readonly AssetCard!: AssetCard;
  protected readonly EventCard!: EventCard;
  protected readonly SkillCard!: SkillCard;
}
