import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { CardBase, CardType } from '../../models/card-base.model';
import { PlayerCardBase, PlayerCardType, AssetCard, EventCard, SkillCard } from '../../models/player-card.model';
import { AsPipe } from '../../pipes/as.pipe';
import { AssetCardComponent } from '../asset-card/asset-card.component';
import { EventCardComponent } from '../event-card/event-card.component';
import { SkillCardComponent } from '../skill-card/skill-card.component';

@Component({
  selector: 'ah-card',
  standalone: true,
  imports: [
    AsPipe,
    AssetCardComponent,
    EventCardComponent,
    SkillCardComponent
  ],
  templateUrl: './card.component.html',
  styles: `:host {
  @apply overflow-hidden;
  }`,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CardComponent {
  card = input.required<CardBase>();

  protected readonly PlayerCardBase!: PlayerCardBase;
  protected readonly AssetCard!: AssetCard;
  protected readonly EventCard!: EventCard;
  protected readonly SkillCard!: SkillCard;
  protected readonly CardType = CardType;
  protected readonly PlayerCardType = PlayerCardType;
}
