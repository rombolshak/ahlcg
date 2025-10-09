import { investigatorId } from '../../entities/id.model';
import { Investigator } from '../../entities/investigator.model';
import { slotsCount, SlotsCount } from '../../entities/player-card.model';
import {
  cardA,
  cardA2,
  cardA3,
  cardA4,
  cardA5,
  cardA6,
  cardE,
  cardS,
} from './test-cards';
import { testEnemy, testEnemy2 } from './test-enemies';

export const defaultSlots: SlotsCount = slotsCount.assert({
  hand: 2,
  ally: 1,
  body: 1,
  accessory: 1,
  arcane: 2,
  tarot: 0,
});

export const InvestigatorS: Investigator = {
  id: investigatorId.assert('1002'),
  cardType: 'investigator',
  setInfo: {
    set: '01',
    index: '002',
  },
  skills: {
    willpower: 3,
    intellect: 4,
    combat: 1,
    agility: 3,
  },
  faction: 'seeker',
  health: {
    max: 5,
    damaged: 1,
  },
  sanity: {
    max: 7,
    damaged: 3,
  },

  threatArea: [],
  hand: [],
  controlledAssets: [],
  slotsCount: defaultSlots,
};

export const InvestigatorG: Investigator = {
  ...InvestigatorS,
  id: investigatorId.assert('1003'),
  faction: 'guardian',
  threatArea: [testEnemy.id, testEnemy2.id],
  controlledAssets: [
    cardA.id,
    cardA5.id,
    cardA2.id,
    cardA3.id,
    cardA4.id,
    cardA6.id,
  ],
  hand: [cardA.id, cardS.id, cardE.id],
};
