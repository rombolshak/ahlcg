import { AssetState } from './asset.state';
import { EnemyWithState } from './enemy.model';
import {
  PlayerCardBase,
  PlayerCardType,
  WithHealth,
} from './player-card.model';

export interface InvestigatorModel extends PlayerCardBase, WithHealth {
  playerCardType: PlayerCardType.Investigator;
}

export interface InvestigatorWithState extends InvestigatorModel, AssetState {
  threatArea: EnemyWithState[];
}
