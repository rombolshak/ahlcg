import { CardInfo } from './card-info.model';

export type Location = CardInfo & {
  shroud: number;
  clues: number;
};
