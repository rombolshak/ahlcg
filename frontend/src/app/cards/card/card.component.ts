import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { CardBase, CardType } from '../../models/card-base.model';
import { PlayerCardBase, PlayerCardType, AssetCard, EventCard, SkillCard } from '../../models/player-card.model';
import { AsPipe } from '../../pipes/as.pipe';
import { AssetCardComponent } from '../asset-card/asset-card.component';
import { animate, state, style, transition, trigger } from '@angular/animations';
import { EventCardComponent } from '../event-card/event-card.component';

@Component({
  selector: 'ah-card',
  standalone: true,
  imports: [
    AsPipe,
    AssetCardComponent,
    EventCardComponent
  ],
  templateUrl: './card.component.html',
  styles: ``,
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [
    trigger('flip', [
      state('back', style({ transform: 'rotateY(0)' })),
      state('front', style({ transform: 'rotateY(180deg)' })),
      transition('* => back', [animate('0.75s')]),
      transition('* => front', [animate('0.75s', style({ transform: 'rotateY(-180deg)' }))])
    ])
  ]
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
