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
  traits: [],
  abilities: [],
  health: 5,
  sanity: 7,
};
