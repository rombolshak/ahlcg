import {Component} from '@angular/core';
import {RouterOutlet} from '@angular/router';
import {PlayerCardComponent} from './player-card/player-card.component';
import {CardAbilityType, CardClass, CardSlot, PlayerCard, PlayerCardType, SkillType} from './models/player-card';

@Component({
  selector: 'ah-root',
  standalone: true,
  imports: [RouterOutlet, PlayerCardComponent],
  template: '<ah-player-card class="scale-50 hover:scale-100 transform-gpu" [card]="card"></ah-player-card>'
})
export class AppComponent {
  card: PlayerCard = {
    type: PlayerCardType.Asset,
    class: CardClass.Seeker,
    id: "09045",
    cost: 1,
    title: "Исследовательские заметки",
    skills: [SkillType.Intellect],
    traits: [{key: "Item", displayValue: "Вещь"}, {key: "Tome", displayValue: "Книга"}, {key: "Science", displayValue: "Наука"}],
    slots: [CardSlot.Hand],
    abilities: [
      {
        type: CardAbilityType.Reaction,
        text: "After a player card ability places 1 or more of your clues on your location: Place that many resources on Research Notes, as evidence."
      },
      {
        type: CardAbilityType.Action,
        text: "Test #i(0). For each point you succeed by, you may spend 1 evidence to discover 1 clue at your location."
      }
    ]
  }
}
