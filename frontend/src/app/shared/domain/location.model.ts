import { CardInfo, CardType } from './card-info.model';

export interface Location extends CardInfo {
  cardType: CardType.Location;
  shroud: number;
  clues: number;
  color: string;
}
