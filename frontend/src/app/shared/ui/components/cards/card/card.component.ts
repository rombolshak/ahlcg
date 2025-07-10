import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import {
  AssetCard,
  EventCard,
  PlayerCard,
  PlayerCardBase,
  SkillCard,
} from 'shared/domain/entities/player-card.model';
import { AsPipe } from 'shared/ui/pipes/as.pipe';
import { AssetCardComponent } from '../asset-card/asset-card.component';
import { EventCardComponent } from '../event-card/event-card.component';
import { SkillCardComponent } from '../skill-card/skill-card.component';
import { DisplayOptions } from 'shared/domain/display.options';

@Component({
  selector: 'ah-card',
  imports: [AsPipe, AssetCardComponent, EventCardComponent, SkillCardComponent],
  templateUrl: './card.component.html',
  styles: ``,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CardComponent {
  readonly card = input.required<PlayerCard>();
  readonly displayOptions = input.required<DisplayOptions>();

  protected readonly PlayerCardBase!: PlayerCardBase;
  protected readonly AssetCard!: AssetCard;
  protected readonly EventCard!: EventCard;
  protected readonly SkillCard!: SkillCard;
}
