import { Location } from '../../entities/location.model';
import { locationId } from '../../entities/id.model';

export const testLocation: Location = {
  id: locationId.assert('2126'),
  type: 'location',
  shroud: 2,
  clues: 3,
  color: 'var(--color-amber-700)',
  info: {
    title: 'Вход в музей',
    abilities: [
      '<b>Forced</b> - When the Ghoul Priest spawns: Spawn it here instead of at its normal location.',
      '#n#: Draw 1 card and gain 1 resource. (Limit once per turn.)',
    ],
    traits: ['Arkham', 'Ritual'],
    setInfo: {
      set: '02',
      index: '126',
    },
    copyright: {
      illustrator: 'Preston Stone',
      ffg: '2016',
    },
  },
};

export const testLocation2: Location = {
  id: locationId.assert('2128'),
  type: 'location',
  shroud: 1,
  clues: 2,
  color: 'var(--color-green-700)',
  info: {
    title: 'Вход в музей',
    subtitle: 'Южная сторона',
    abilities: [],
    traits: [],
    setInfo: {
      set: '02',
      index: '126',
    },
    copyright: {
      illustrator: 'Preston Stone',
      ffg: '2016',
    },
  },
};

export const testLocation3: Location = {
  ...testLocation2,
  id: locationId.assert('2129'),
  color: 'var(--color-yellow-400)',
};
