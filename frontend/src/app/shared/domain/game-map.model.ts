import { location } from './location.model';
import { type } from 'arktype';
import { investigator } from './investigator.model';

const _place = type({
  x: 'number.integer > 0',
  y: 'number.integer > 0',
  location,
  investigators: investigator.array(),
});

const _connection = type({
  from: 'number.integer > 0',
  to: 'number.integer > 0',
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
