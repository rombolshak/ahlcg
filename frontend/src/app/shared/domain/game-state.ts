import { type } from 'arktype';
import { gameMap } from './game-map.model';
import { actId, agendaId, investigatorId } from './entities/id.model';
import { action } from './action.model';
import { gameEntity } from './game-entity';

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
