import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { CardBack, CardBase, CardType } from '../../models/card-base.model';
import { PlayerCardBase, PlayerCardType, AssetCard } from '../../models/player-card.model';
import { AsPipe } from '../../pipes/as.pipe';
import { AssetCardComponent } from '../asset-card/asset-card.component';
import { PlayerBackCardComponent } from '../player-back-card/player-back-card.component';
import { animate, state, style, transition, trigger } from '@angular/animations';

@Component({
  selector: 'ah-card',
  standalone: true,
  imports: [
    AsPipe,
    AssetCardComponent,
    PlayerBackCardComponent
  ],
  templateUrl: './card.component.html',
  styles: ``,
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [
    trigger('flip', [
      state('front', style({ transform: 'rotateY(0)' })),
      state('back', style({ transform: 'rotateY(180deg)' })),
      transition('* => *', [animate('0.75s')])
    ])
  ]
})
export class CardComponent {
  front = input.required<CardBase>();
  back = input.required<{ backType: CardBack } | CardBase>();

  showBack = true;

  protected readonly PlayerCardBase!: PlayerCardBase;
  protected readonly AssetCard!: AssetCard;
  protected readonly CardType = CardType;
  protected readonly PlayerCardType = PlayerCardType;
}
