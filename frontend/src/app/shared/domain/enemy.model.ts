import { CardInfo, CardType } from './card-info.model';
import { AssetState } from './asset.state';
import { WithHealth } from './player-card.model';

export interface Enemy extends CardInfo, Partial<WithHealth> {
  cardType: CardType.Enemy;
  fight: number;
  evade: number;
  damageAttack: number;
  horrorAttack: number;
  isMassive: boolean;
}

export interface EnemyWithState extends Enemy, AssetState {}
