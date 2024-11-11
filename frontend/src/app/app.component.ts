import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import {
  AssetCard,
  AssetSlot,
  EventCard,
  PlayerCardClass,
  PlayerCardType,
  SkillType
} from './models/player-card.model';
import { AssetCardComponent } from './cards/asset-card/asset-card.component';
import { CardType } from './models/card-base.model';
import { CardComponent } from './cards/card/card.component';

@Component({
  selector: 'ah-root',
  standalone: true,
  imports: [RouterOutlet, AssetCardComponent, CardComponent],
  template:
    '<ah-card [card]="card"></ah-card>'
})
export class AppComponent {
  card: EventCard = {
    cardType: CardType.Player,
    playerCardType: PlayerCardType.Event,
    class: PlayerCardClass.Seeker,
    cost: 3,
    title: '"I\'ve got a plan!"',
    skills: [SkillType.Intellect, SkillType.Combat],
    traits: [
      { key: 'Insight', displayValue: 'Insight' },
      { key: 'Tactic', displayValue: 'Tactic' }
    ],
    abilities: ['<b>Fight</b>. This attack uses #i#. You deal +1 damage for this attack for each clue you have (max +3 damage).'],
    flavor: '"That\'s the worst plan I\'ve ever heard.\n Well, what are we waiting for?"',
    setInfo: {
      set: '02',
      index: '107'
    },
    copyright: {
      illustrator: 'Robert Laskey',
      ffg: '2016 FFG'
    }
  };
}
