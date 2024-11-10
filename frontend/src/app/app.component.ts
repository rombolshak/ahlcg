import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AssetCard, AssetSlot, PlayerCardClass, PlayerCardType, SkillType } from './models/player-card.model';
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
  card: AssetCard = {
    cardType: CardType.Player,
    playerCardType: PlayerCardType.Asset,
    class: PlayerCardClass.Neutral,
    cost: 1,
    title: 'Исследовательские заметки',
    skills: [SkillType.Intellect, SkillType.Intellect],
    traits: [
      { key: 'Item', displayValue: 'Вещь' },
      { key: 'Tome', displayValue: 'Книга' },
      { key: 'Science', displayValue: 'Наука' }
    ],
    slot: AssetSlot.Hand,
    abilities: [
      '#r#: After a player card ability places 1 or more of your clues on your location: Place that many resources on Research Notes, as evidence.',
      '#n#: Test #i#(0). For each point you succeed by, you may spend 1 evidence to discover 1 clue at your location.'
    ],
    setInfo: {
      set: '09',
      index: '045'
    },
    copyright: {
      illustrator: 'Pixoloid Studious',
      ffg: '2022 FFG'
    }
  };
}
