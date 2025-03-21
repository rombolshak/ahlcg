import { Location } from '../location.model';
import { CardType } from '../card-info.model';

export const testLocation: Location = {
  shroud: 2,
  clues: 3,
  color: 'var(--color-amber-700)',
  id: '02126',
  title: 'Вход в музей',
  abilities: [
    '<b>Forced</b> - When the Ghoul Priest spawns: Spawn it here instead of at its normal location.',
    '#n#: Draw 1 card and gain 1 resource. (Limit once per turn.)',
  ],
  traits: [
    {
      key: 'Arkham',
      displayValue: 'Arkham',
    },
    {
      key: 'Ritual',
      displayValue: 'Ritual',
    },
  ],
  setInfo: {
    set: '02',
    index: '126',
  },
  cardType: CardType.Location,
  copyright: {
    illustrator: 'Preston Stone',
    ffg: '2016',
  },
};

export const testLocation2: Location = {
  shroud: 1,
  clues: 2,
  color: 'var(--color-green-700)',
  id: '02126',
  title: 'Вход в музей',
  subtitle: 'Южная сторона',
  abilities: [],
  traits: [],
  setInfo: {
    set: '02',
    index: '126',
  },
  cardType: CardType.Location,
  copyright: {
    illustrator: 'Preston Stone',
    ffg: '2016',
  },
};

export const testLocation3: Location = {
  ...testLocation2,
  color: 'var(--color-yellow-400)',
};
