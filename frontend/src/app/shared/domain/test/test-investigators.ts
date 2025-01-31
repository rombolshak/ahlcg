import { CardType } from '../card-info.model';
import {
  InvestigatorModel,
  PlayerCardClass,
  PlayerCardType,
  SkillType,
} from '../player-card.model';

export const InvestigatorS: InvestigatorModel = {
  setInfo: {
    set: '01',
    index: '002',
  },
  id: '01002',
  title: 'Daisy Walker',
  subtitle: 'The Librarian',
  cardType: CardType.Player,
  playerCardType: PlayerCardType.Investigator,
  copyright: {
    ffg: '2016',
    illustrator: 'Magali Villeneuve',
  },
  skills: new Map<SkillType, number>([
    [SkillType.Willpower, 3],
    [SkillType.Intellect, 4],
    [SkillType.Combat, 1],
    [SkillType.Agility, 3],
  ]),
  class: PlayerCardClass.Seeker,
  traits: [{ key: 'Miskatonic', displayValue: 'Miskatonic' }],
  abilities: [
    'You may take an additional action during your turn, which can only be used on @Tome@ abilities.',
    '#E# effect: +0. If you succeed, draw 1 card for each @Tome@ you control',
  ],
  health: 5,
  sanity: 7,
};
