import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import {
  AssetCard,
  AssetSlot,
  EventCard,
  PlayerCardClass,
  PlayerCardType,
  SkillCard,
  SkillType
} from './models/player-card.model';
import { AssetCardComponent } from './cards/asset-card/asset-card.component';
import { CardType } from './models/card-base.model';
import { CardComponent } from './cards/card/card.component';
import { NgOptimizedImage } from '@angular/common';
import { CardsHandComponent } from './cards-hand/cards-hand.component';

@Component({
  selector: 'ah-root',
  standalone: true,
  imports: [RouterOutlet, AssetCardComponent, CardComponent, NgOptimizedImage, CardsHandComponent],
  template:
    '<img ngSrc="/assets/images/bg-min.jpg" fill priority class="-z-50" />' +
    '<ah-cards-hand [cards]="[cardE, cardA, cardS]" class="w-3/5"></ah-cards-hand>',
  styles: `:host {
  @apply flex w-screen h-screen overflow-hidden;
  }`
})
export class AppComponent {
  cardE: EventCard = {
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
      ffg: '2016'
    },
    displayOptions: { textSize: 'm' }
  };

  cardA: AssetCard = {
    cardType: CardType.Player,
    playerCardType: PlayerCardType.Asset,
    class: PlayerCardClass.Seeker,
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
      ffg: '2022'
    },
    displayOptions: { textSize: 'm' }
  };

  cardS: SkillCard = {
    cardType: CardType.Player,
    playerCardType: PlayerCardType.Skill,
    class: PlayerCardClass.Mystic,
    title: 'Обречённый на проклятья',
    skills: [SkillType.Wild],
    traits: [
      { key: 'Innate', displayValue: 'Врождённый' },
      { key: 'Cursed', displayValue: 'Проклятый' }
    ],
    abilities: ['Когда вы добавляете эту карту к проверке, добавьте в мешок хаоса до 3 жетонов #Z#.\n В этой проверке считайте модификатор каждого вытянутого жетона #Z# равным 0.'],
    flavor: 'Не всякий скиталец — потерянный',
    setInfo: {
      set: '10',
      index: '095'
    },
    copyright: {
      illustrator: 'David Hovey',
      ffg: '2024'
    },
    displayOptions: { textSize: 's' }
  };
}
