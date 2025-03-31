import { GameState } from '../game-state';
import { testGameMap } from './test-game-map';
import { testAct } from './test-act';
import { testAgenda } from './test-agenda';
import { InvestigatorS } from './test-investigators';
import { testEnemy } from './test-enemies';
import {
  cardA,
  cardA2,
  cardA3,
  cardA4,
  cardA5,
  cardE,
  cardS,
} from './test-cards';
import { testActions } from './test-actions';

export const testGameState: GameState = {
  map: testGameMap,
  acts: [testAct],
  agendas: [testAgenda],
  investigators: [
    {
      ...InvestigatorS,
      threatArea: [testEnemy, { ...testEnemy, health: { max: 5, damaged: 3 } }],
      controlledAssets: [cardA, cardA5, cardA2, cardA3, cardA4, cardA, cardA],
      hand: [cardA, cardS, cardE],
      availableActions: testActions,
    },
  ],
  enemies: [],
};
