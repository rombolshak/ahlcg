﻿import {
  AssetCard,
  AssetSlot,
  EventCard,
  PlayerCardClass,
  PlayerCardType,
  SkillCard,
  SkillType,
} from '../player-card.model';
import { CardType } from '../card-info.model';

export const cardE: EventCard = {
  id: '1',
  cardType: CardType.Player,
  playerCardType: PlayerCardType.Event,
  class: PlayerCardClass.Seeker,
  cost: 3,
  title: '"I\'ve got a plan!"',
  skills: [SkillType.Intellect, SkillType.Combat],
  traits: [
    { key: 'Insight', displayValue: 'Insight' },
    { key: 'Tactic', displayValue: 'Tactic' },
  ],
  abilities: [
    '<b>Fight</b>. This attack uses #i#. You deal +1 damage for this attack for each clue you have (max +3 damage).',
  ],
  flavor:
    '"That\'s the worst plan I\'ve ever heard.\n Well, what are we waiting for?"',
  setInfo: {
    set: '02',
    index: '107',
  },
  copyright: {
    illustrator: 'Robert Laskey',
    ffg: '2016',
  },
};

export const cardA: AssetCard = {
  id: '2',
  cardType: CardType.Player,
  playerCardType: PlayerCardType.Asset,
  class: PlayerCardClass.Seeker,
  cost: 1,
  title: 'Исследовательские заметки',
  skills: [SkillType.Intellect, SkillType.Intellect],
  traits: [
    { key: 'Item', displayValue: 'Вещь' },
    { key: 'Tome', displayValue: 'Книга' },
    { key: 'Science', displayValue: 'Наука' },
  ],
  slot: AssetSlot.Hand,
  abilities: [
    '#r#: After a player card ability places 1 or more of your clues on your location: Place that many resources on Research Notes, as evidence.',
    '#n#: Test #i#(0). For each point you succeed by, you may spend 1 evidence to discover 1 clue at your location.',
  ],
  setInfo: {
    set: '09',
    index: '045',
  },
  copyright: {
    illustrator: 'Pixoloid Studious',
    ffg: '2022',
  },
};

export const cardS: SkillCard = {
  id: '3',
  cardType: CardType.Player,
  playerCardType: PlayerCardType.Skill,
  class: PlayerCardClass.Mystic,
  title: 'Обречённый на проклятья',
  skills: [SkillType.Wild],
  traits: [
    { key: 'Innate', displayValue: 'Врождённый' },
    { key: 'Cursed', displayValue: 'Проклятый' },
  ],
  abilities: [
    'Когда вы добавляете эту карту к проверке, добавьте в мешок хаоса до 3 жетонов #Z#.\n В этой проверке считайте модификатор каждого вытянутого жетона #Z# равным 0.',
  ],
  flavor: 'Не всякий скиталец — потерянный',
  setInfo: {
    set: '10',
    index: '095',
  },
  copyright: {
    illustrator: 'David Hovey',
    ffg: '2024',
  },
};