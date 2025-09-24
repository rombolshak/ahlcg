import { Traversal, type } from 'arktype';
import { action } from './action.model';
import { CardType } from './entities/card.model';
import {
  ActId,
  actId,
  AgendaId,
  agendaId,
  EntityId,
  InvestigatorId,
  investigatorId,
  LocationId,
} from './entities/id.model';
import { Investigator } from './entities/investigator.model';
import { GameEntity, gameEntity } from './game-entity';
import { gameMap } from './game-map.model';
import { metaInfo } from './meta-info';

type GameEntities = Record<EntityId, GameEntity>;

function validateEntity(
  id: EntityId | undefined,
  gameEntities: GameEntities,
  ctx: Traversal,
  path: readonly string[],
  entityType: CardType | CardType[],
): boolean {
  if (!id)
    return ctx.reject({
      path: path,
      problem: `${entityType.toString()}Id is undefined.`,
    });
  if (!gameEntities[id])
    return ctx.reject({
      path: path,
      problem: `${entityType.toString()} '${id}' does not exists in gameEntities.`,
    });
  if (entityType instanceof Array) {
    if (!entityType.find((v) => v === gameEntities[id]?.cardType))
      return ctx.reject({
        path: path,
        expected: entityType.join(' or '),
        actual: gameEntities[id].cardType,
      });
  } else if (gameEntities[id].cardType !== entityType)
    return ctx.reject({
      path: path,
      expected: entityType,
      actual: gameEntities[id].cardType,
    });

  return true;
}

function validateActs(
  state: { acts: ActId[]; gameEntities: GameEntities },
  ctx: Traversal,
) {
  return state.acts.reduce(
    (result, act, index) =>
      result &&
      validateEntity(
        act,
        state.gameEntities,
        ctx,
        ['acts', index.toString()],
        'act',
      ),
    true,
  );
}

function validateAgendas(
  state: { agendas: AgendaId[]; gameEntities: GameEntities },
  ctx: Traversal,
) {
  return state.agendas.reduce(
    (result, agendaId, index) =>
      result &&
      validateEntity(
        agendaId,
        state.gameEntities,
        ctx,
        ['agendas', index.toString()],
        'agenda',
      ),
    true,
  );
}

function validateCurrentInvestigator(
  state: {
    currentInvestigator: InvestigatorId;
    gameEntities: GameEntities;
  },
  ctx: Traversal,
) {
  return validateEntity(
    state.currentInvestigator,
    state.gameEntities,
    ctx,
    ['currentInvestigator'],
    'investigator',
  );
}

function validateSingleInvestigator(
  state: {
    investigators: InvestigatorId[];
    gameEntities: GameEntities;
  },
  i: number,
  ctx: Traversal,
) {
  return validateEntity(
    state.investigators[i],
    state.gameEntities,
    ctx,
    ['investigators', i.toString()],
    'investigator',
  );
}

function validateThreatArea(
  investigator: Investigator,
  state: { gameEntities: GameEntities },
  ctx: Traversal,
) {
  return investigator.threatArea.reduce(
    (result, threat, index) =>
      result &&
      validateEntity(
        threat,
        state.gameEntities,
        ctx,
        ['gameEntities', investigator.id, 'threatArea', index.toString()],
        'enemy',
      ),
    true,
  );
}

function validateHand(
  investigator: Investigator,
  state: { gameEntities: GameEntities },
  ctx: Traversal,
) {
  return investigator.hand.reduce(
    (result, card, index) =>
      result &&
      validateEntity(
        card,
        state.gameEntities,
        ctx,
        ['gameEntities', investigator.id, 'hand', index.toString()],
        ['asset', 'skill', 'event'],
      ),
    true,
  );
}

function validateAssets(
  investigator: Investigator,
  state: { gameEntities: GameEntities },
  ctx: Traversal,
) {
  return investigator.controlledAssets.reduce(
    (result, asset, index) =>
      result &&
      validateEntity(
        asset,
        state.gameEntities,
        ctx,
        ['gameEntities', investigator.id, 'controlledAssets', index.toString()],
        'asset',
      ),
    true,
  );
}

function validateInvestigators(
  state: { investigators: InvestigatorId[]; gameEntities: GameEntities },
  ctx: Traversal,
) {
  return state.investigators.reduce((result, investigatorId, index) => {
    if (!validateSingleInvestigator(state, index, ctx)) return false;
    const investigator = state.gameEntities[investigatorId] as Investigator;
    return (
      result &&
      validateThreatArea(investigator, state, ctx) &&
      validateHand(investigator, state, ctx) &&
      validateAssets(investigator, state, ctx)
    );
  }, true);
}

function validatePlaceLocation(
  place: { location: LocationId },
  state: {
    gameEntities: GameEntities;
  },
  ctx: Traversal,
  i: number,
) {
  return validateEntity(
    place.location,
    state.gameEntities,
    ctx,
    ['scenarioMap', 'places', i.toString(), 'location'],
    'location',
  );
}

function validatePlaceInvestigator(
  place: { investigators: InvestigatorId[] },
  state: {
    gameEntities: GameEntities;
  },
  ctx: Traversal,
  i: number,
) {
  return place.investigators.reduce(
    (result, investigatorId, index) =>
      result &&
      validateEntity(
        investigatorId,
        state.gameEntities,
        ctx,
        [
          'scenarioMap',
          'places',
          i.toString(),
          'investigators',
          index.toString(),
        ],
        'investigator',
      ),
    true,
  );
}

function validatePlaces(
  state: {
    scenarioMap: {
      places: { location: LocationId; investigators: InvestigatorId[] }[];
    };
    gameEntities: GameEntities;
  },
  ctx: Traversal,
) {
  return state.scenarioMap.places.reduce((result, place, index) => {
    return (
      result &&
      validatePlaceLocation(place, state, ctx, index) &&
      validatePlaceInvestigator(place, state, ctx, index)
    );
  }, true);
}

function validateConnections(
  state: {
    scenarioMap: {
      connections: { from: LocationId; to: LocationId }[];
      places: { location: LocationId }[];
    };
  },
  ctx: Traversal,
) {
  return state.scenarioMap.connections.reduce((result, connection, index) => {
    if (!result) return result;
    if (!state.scenarioMap.places.find((p) => p.location === connection.from))
      return ctx.reject({
        path: ['scenarioMap', 'connections', index.toString(), 'from'],
        problem: `place ${connection.from} is not specified in map`,
      });
    if (!state.scenarioMap.places.find((p) => p.location === connection.to))
      return ctx.reject({
        path: ['scenarioMap', 'connections', index.toString(), 'to'],
        problem: `place ${connection.to} is not specified in map`,
      });
    if (connection.from === connection.to)
      return ctx.reject({
        path: ['scenarioMap', 'connections', index.toString()],
        problem: `Illegal connection to the same location`,
      });
    return true;
  }, true);
}

export const gameState = type({
  metaInfo,
  acts: actId.array().atLeastLength(1),
  agendas: agendaId.array().atLeastLength(1),
  investigators: investigatorId.array().atLeastLength(1),
  scenarioMap: gameMap,
  currentInvestigator: investigatorId,
  availableActions: action.array(),
  gameEntities: {
    '[string]': gameEntity,
  },
}).narrow((state, ctx: Traversal) => {
  return (
    validateActs(state, ctx) &&
    validateAgendas(state, ctx) &&
    validateCurrentInvestigator(state, ctx) &&
    validateInvestigators(state, ctx) &&
    validatePlaces(state, ctx) &&
    validateConnections(state, ctx)
  );
});

export type GameState = typeof gameState.infer;
