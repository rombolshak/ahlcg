import { Traversal, type } from 'arktype';
import { gameMap } from './game-map.model';
import { actId, agendaId, EntityId, investigatorId } from './entities/id.model';
import { action } from './action.model';
import { GameEntity, gameEntity } from './game-entity';
import { CardType } from './entities/card.model';
import { Investigator } from './entities/investigator.model';

function validateEntity(
  id: EntityId | undefined,
  gameEntities: Record<EntityId, GameEntity>,
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
    if (!entityType.find((v) => v === gameEntities[id]?.type))
      return ctx.reject({
        path: path,
        expected: entityType.join(' or '),
        actual: gameEntities[id].type,
      });
  } else if (gameEntities[id].type !== entityType)
    return ctx.reject({
      path: path,
      expected: entityType,
      actual: gameEntities[id].type,
    });

  return true;
}

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
}).narrow((state, ctx) => {
  for (let i = 0; i < state.acts.length; i++) {
    if (
      !validateEntity(
        state.acts[i],
        state.gameEntities,
        ctx,
        ['acts', i.toString()],
        'act',
      )
    )
      return false;
  }

  for (let i = 0; i < state.agendas.length; i++) {
    if (
      !validateEntity(
        state.agendas[i],
        state.gameEntities,
        ctx,
        ['agendas', i.toString()],
        'agenda',
      )
    )
      return false;
  }

  if (
    !validateEntity(
      state.currentInvestigator,
      state.gameEntities,
      ctx,
      ['currentInvestigator'],
      'investigator',
    )
  )
    return false;

  for (let i = 0; i < state.investigators.length; i++) {
    if (
      !validateEntity(
        state.investigators[i],
        state.gameEntities,
        ctx,
        ['investigators', i.toString()],
        'investigator',
      )
    )
      return false;

    const investigator = state.gameEntities[
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      state.investigators[i]!
    ] as Investigator;
    for (let e = 0; e < investigator.threatArea.length; e++) {
      if (
        !validateEntity(
          investigator.threatArea[e],
          state.gameEntities,
          ctx,
          ['gameEntities', investigator.id, 'threatArea', e.toString()],
          'enemy',
        )
      )
        return false;
    }

    for (let h = 0; h < investigator.hand.length; h++) {
      if (
        !validateEntity(
          investigator.hand[h],
          state.gameEntities,
          ctx,
          ['gameEntities', investigator.id, 'hand', h.toString()],
          ['asset', 'skill', 'event'],
        )
      )
        return false;
    }

    for (let e = 0; e < investigator.controlledAssets.length; e++) {
      if (
        !validateEntity(
          investigator.controlledAssets[e],
          state.gameEntities,
          ctx,
          ['gameEntities', investigator.id, 'controlledAssets', e.toString()],
          'asset',
        )
      )
        return false;
    }
  }

  for (let i = 0; i < state.scenarioMap.places.length; i++) {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const place = state.scenarioMap.places[i]!;
    if (
      !validateEntity(
        place.location,
        state.gameEntities,
        ctx,
        ['scenarioMap', 'places', i.toString(), 'location'],
        'location',
      )
    )
      return false;
    for (let e = 0; e < place.investigators.length; e++) {
      if (
        !validateEntity(
          place.investigators[e],
          state.gameEntities,
          ctx,
          [
            'scenarioMap',
            'places',
            i.toString(),
            'investigators',
            e.toString(),
          ],
          'investigator',
        )
      )
        return false;
    }
  }

  for (let i = 0; i < state.scenarioMap.connections.length; i++) {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const connection = state.scenarioMap.connections[i]!;
    if (!state.scenarioMap.places.find((p) => p.location === connection.from))
      return ctx.reject({
        path: ['scenarioMap', 'connections', i.toString(), 'from'],
        problem: `place ${connection.from} is not specified in map`,
      });
    if (!state.scenarioMap.places.find((p) => p.location === connection.to))
      return ctx.reject({
        path: ['scenarioMap', 'connections', i.toString(), 'to'],
        problem: `place ${connection.to} is not specified in map`,
      });
    if (connection.from === connection.to)
      return ctx.reject({
        path: ['scenarioMap', 'connections', i.toString()],
        problem: `Illegal connection to the same location`,
      });
  }

  return true;
});

export type GameState = typeof gameState.infer;
