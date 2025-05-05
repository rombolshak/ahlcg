import {
  AssetCard,
  EventCard,
  SkillCard,
} from '../../entities/player-card.model';
import { DisplayOptions } from '../../display.options';
import { assetId, eventId, skillId } from '../../entities/id.model';

export const displayOption: DisplayOptions = { cardSize: 'm', textSize: 'm' };

export const cardE: EventCard = {
  id: eventId.assert('1'),
  type: 'event',
  info: {
    title: '"I\'ve got a plan!"',
    traits: ['Insight', 'Tactic'],
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
  },
  skills: {
    intellect: 1,
    combat: 1,
  },
  class: 'seeker',
  cost: 3,
};

export const cardA: AssetCard = {
  id: assetId.assert(2),
  type: 'asset',
  info: {
    title: 'Исследовательские заметки',
    traits: ['Вещь', 'Книга', 'Наука'],
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
  },
  class: 'seeker',
  skills: { intellect: 2 },
  cost: 1,
  slot: 'hand',
};

export const cardA2: AssetCard = {
  ...cardA,
  id: assetId.assert(3),
  class: 'guardian',
  slot: 'ally',
  info: {
    ...cardA.info,
    subtitle: 'Law enforcer',
  },
  health: {
    max: 2,
    damaged: 0,
  },
};
export const cardA3: AssetCard = {
  ...cardA,
  id: assetId.assert(4),
  class: 'rogue',
  sanity: {
    max: 1,
    damaged: 0,
  },
  slot: 'accessory',
};
export const cardA4: AssetCard = {
  ...cardA,
  id: assetId.assert(5),
  class: 'mystic',
};
export const cardA5: AssetCard = {
  ...cardA,
  id: assetId.assert(6),
  class: 'neutral',
};

export const cardS: SkillCard = {
  id: skillId.assert(7),
  type: 'skill',
  info: {
    title: 'Обречённый на проклятья',
    traits: ['Врождённый', 'Проклятый'],
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
  },
  class: 'survivor',
  skills: {
    wild: 1,
  },
};
