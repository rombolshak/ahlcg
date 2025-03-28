import { act } from './act.model';
import { agenda } from './agenda.model';
import { investigator } from './investigator.model';
import { enemy } from './enemy.model';

import { type } from 'arktype';

export const gameState = type({
  acts: act.array().atLeastLength(1),
  agendas: agenda.array().atLeastLength(1),
  investigators: investigator.array().atLeastLength(1),
  enemies: enemy.array(),
});

export type GameState = typeof gameState.infer;
