import { Location } from '../../entities/location.model';
import { locationId } from '../../entities/id.model';

export const testLocation: Location = {
  id: locationId.assert('2126'),
  cardType: 'location',
  shroud: 2,
  clues: 3,
  color: 'var(--color-amber-700)',
  setInfo: {
    set: '02',
    index: '126',
  },
};

export const testLocation2: Location = {
  id: locationId.assert('2128'),
  cardType: 'location',
  setInfo: {
    set: '02',
    index: '126',
  },
  shroud: 1,
  clues: 2,
  color: 'var(--color-green-700)',
};

export const testLocation3: Location = {
  ...testLocation2,
  id: locationId.assert('2129'),
  color: 'var(--color-yellow-400)',
};
