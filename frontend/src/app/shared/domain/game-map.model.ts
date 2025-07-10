import { type } from 'arktype';
import { investigatorId, locationId } from './entities/id.model';

const _place = type({
  x: 'number.integer > 0',
  y: 'number.integer > 0',
  location: locationId,
  investigators: investigatorId.array(),
});

const _connection = type({
  from: locationId,
  to: locationId,
});

const _gameMap = type({
  width: 'number.integer > 0',
  height: 'number.integer > 0',
  places: _place.array().atLeastLength(1),
  connections: _connection.array(),
});

type _GameMap = typeof _gameMap.infer;

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface GameMap extends _GameMap {}

export const gameMap: type<GameMap> = _gameMap;
