import { CardInfo } from './card-info.model';

export interface Agenda extends CardInfo {
  stage: number;
  requiredDoom: number;
  currentDoom: number;
  doomOnCards: number;
}
