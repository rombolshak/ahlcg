import { DisplayOptions } from '../../display.options';
import { assetId, eventId, skillId } from '../../entities/id.model';
import {
  AssetCard,
  EventCard,
  SkillCard,
} from '../../entities/player-card.model';

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
  faction: 'seeker',
  cost: 3,
};

const card = {
  hasAction: false,
  cardType: 'asset' as const,
  setInfo: {
    set: '09',
    index: '045',
  },
  faction: 'seeker' as const,
  skills: { intellect: 2 },
  cost: 1,
};

export const cardA: AssetCard = {
  ...card,
  id: assetId.assert('2'),
  slot: 'hand',
};

export const cardA2: AssetCard = {
  ...card,
  id: assetId.assert('3'),
  faction: 'guardian',
  slot: 'ally',
  health: {
    max: 2,
    damaged: 0,
  },
};
export const cardA3: AssetCard = {
  ...card,
  id: assetId.assert('4'),
  faction: 'rogue',
  sanity: {
    max: 1,
    damaged: 0,
  },
  slot: 'accessory',
};
export const cardA4: AssetCard = {
  ...card,
  id: assetId.assert('5'),
  faction: 'mystic',
};

export const cardA5: AssetCard = {
  ...card,
  id: assetId.assert('6'),
  faction: 'neutral',
};

export const cardA6: AssetCard = {
  ...card,
  id: assetId.assert('7'),
  hasAction: true,
};

export const cardS: SkillCard = {
  id: skillId.assert('8'),
  cardType: 'skill',
  setInfo: {
    set: '10',
    index: '095',
  },
  faction: 'survivor',
  skills: {
    wild: 1,
  },
};
