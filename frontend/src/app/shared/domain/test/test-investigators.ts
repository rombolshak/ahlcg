import { Investigator } from '../investigator.model';

export const InvestigatorS: Investigator = {
  id: 1002,
  info: {
    cardType: 'player',
    setInfo: {
      set: '01',
      index: '002',
    },
    title: 'Daisy Walker',
    subtitle: 'The Librarian',
    traits: ['Miskatonic'],
    abilities: [
      'You may take an additional action during your turn, which can only be used on @Tome@ abilities.',
      '#E# effect: +0. If you succeed, draw 1 card for each @Tome@ you control',
    ],
    copyright: {
      ffg: '2016',
      illustrator: 'Magali Villeneuve',
    },
  },
  skills: {
    willpower: 3,
    intellect: 4,
    combat: 1,
    agility: 3,
  },
  class: 'seeker',
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
  availableActions: [],
};
