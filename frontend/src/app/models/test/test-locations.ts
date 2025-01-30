import { Location } from '../location.model';
import { CardType } from '../card-info.model';

export const testLocation: Location = {
  shroud: 2,
  clues: 3,
  id: '02126',
  title: 'Вход в музей',
  abilities: [],
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
