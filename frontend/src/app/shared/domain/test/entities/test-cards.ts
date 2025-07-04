﻿import {
  AssetCard,
  EventCard,
  SkillCard,
} from '../../entities/player-card.model';
import { DisplayOptions } from '../../display.options';
import { assetId, eventId, skillId } from '../../entities/id.model';

export const displayOption: DisplayOptions = { cardSize: 'm', textSize: 'm' };

export const cardE: EventCard = {
  id: eventId.assert('1'),
  setInfo: {
    set: '02',
    index: '107',
  },
  cardType: 'event',
  skills: {
    intellect: 1,
    combat: 1,
  },
  class: 'seeker',
  cost: 3,
};

export const cardA: AssetCard = {
  id: assetId.assert('2'),
  cardType: 'asset',
  setInfo: {
    set: '09',
    index: '045',
  },
  class: 'seeker',
  skills: { intellect: 2 },
  cost: 1,
  slot: 'hand',
};

export const cardA2: AssetCard = {
  ...cardA,
  id: assetId.assert('3'),
  class: 'guardian',
  slot: 'ally',
  health: {
    max: 2,
    damaged: 0,
  },
};
export const cardA3: AssetCard = {
  ...cardA,
  id: assetId.assert('4'),
  class: 'rogue',
  sanity: {
    max: 1,
    damaged: 0,
  },
  slot: 'accessory',
};
export const cardA4: AssetCard = {
  ...cardA,
  id: assetId.assert('5'),
  class: 'mystic',
};
export const cardA5: AssetCard = {
  ...cardA,
  id: assetId.assert('6'),
  class: 'neutral',
};

export const cardS: SkillCard = {
  id: skillId.assert('7'),
  cardType: 'skill',
  setInfo: {
    set: '10',
    index: '095',
  },
  class: 'survivor',
  skills: {
    wild: 1,
  },
};
