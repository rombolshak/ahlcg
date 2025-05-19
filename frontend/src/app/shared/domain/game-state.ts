import { act } from './entities/act.model';
import { agenda } from './entities/agenda.model';
import { investigator } from './entities/investigator.model';
import { enemy } from './entities/enemy.model';
import { location } from './entities/location.model';

import { type } from 'arktype';
import { gameMap } from './game-map.model';
import { playerCard } from './entities/player-card.model';
import { actId, agendaId, investigatorId } from './entities/id.model';
import { action } from './action.model';

export const gameEntity = act
  .or(agenda)
  .or(enemy)
  .or(location)
  .or(investigator)
  .or(playerCard);
export type GameEntity = typeof gameEntity.infer;
export const gameEntities = gameEntity.array();

export const gameState = type({
  acts: actId.array().atLeastLength(1),
  agendas: agendaId.array().atLeastLength(1),
  investigators: investigatorId.array().atLeastLength(1),
  scenarioMap: gameMap,
  currentInvestigator: investigatorId,
  availableActions: action.array(),
  gameEntities: {
    '[string]': gameEntity,
  },
});

export type GameState = typeof gameState.infer;
