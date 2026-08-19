import { DisplayOptions } from '@domain/display.options';
import { CardInfo } from '@domain/entities/details/card-info.model';
import { assetId, eventId, skillId } from '@domain/entities/id.model';
import { AssetCard, EventCard, SkillCard } from '@domain/entities/player-card.model';

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

export const cardEInfo: CardInfo = {
  setInfo: { set: '02', index: '107' },
  title: 'cards/02/107.title',
  flavor: 'cards/02/107.flavor',
  traits: ['traits.insight', 'traits.tactic'],
  abilities: ['cards/02/107.a1'],
  copyright: { illustrator: 'Robert Laskey', ffg: '2016' },
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

export const cardAInfo: CardInfo = {
  setInfo: { set: '09', index: '045' },
  title: 'cards/09/045.title',
  traits: ['traits.item', 'traits.book', 'traits.science'],
  abilities: ['cards/09/045.a1', 'cards/09/045.a2'],
  copyright: { illustrator: 'Pixoloid Studious', ffg: '2022' },
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
  slot: 'arcane',
  additionalSlot: 'accessory',
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

export const cardSInfo: CardInfo = {
  setInfo: { set: '10', index: '095' },
  title: 'cards/10/095.title',
  flavor: 'cards/10/095.flavor',
  traits: ['traits.innate', 'traits.cursed'],
  abilities: ['cards/10/095.a1'],
  copyright: { illustrator: 'David Hovey', ffg: '2024' },
};
