import { CardInfo } from './card-info.model';

export interface Objective {
  description: string;
  requiredValue: number;
  currentValue: number;
  startValue: number;
  type: 'clue' | 'health' | 'resource';
}

export interface Act extends CardInfo {
  stage: number;
  objectives: Objective[];
}
