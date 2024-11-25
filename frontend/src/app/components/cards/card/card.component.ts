import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { CardInfo, CardType } from 'models/card-info.model';
import {
  PlayerCardBase,
  PlayerCardType,
  AssetCard,
  EventCard,
  SkillCard,
} from 'models/player-card.model';
import { AsPipe } from 'pipes/as.pipe';
import { AssetCardComponent } from '../asset-card/asset-card.component';
import { EventCardComponent } from '../event-card/event-card.component';
import { SkillCardComponent } from '../skill-card/skill-card.component';
import { DisplayOptions } from 'models/display.options';

@Component({
  selector: 'ah-card',
  imports: [AsPipe, AssetCardComponent, EventCardComponent, SkillCardComponent],
  templateUrl: './card.component.html',
  styles: ``,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CardComponent {
  card = input.required<CardInfo>();
  displayOptions = input.required<DisplayOptions>();

  protected readonly PlayerCardBase!: PlayerCardBase;
  protected readonly AssetCard!: AssetCard;
  protected readonly EventCard!: EventCard;
  protected readonly SkillCard!: SkillCard;
  protected readonly CardType = CardType;
  protected readonly PlayerCardType = PlayerCardType;
}
