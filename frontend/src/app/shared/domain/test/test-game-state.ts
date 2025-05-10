import { GameState } from '../game-state';
import { testGameMap } from './test-game-map';
import { testAct } from './entities/test-act';
import { testAgenda } from './entities/test-agenda';
import { InvestigatorS } from './entities/test-investigators';
import { testActions } from './test-actions';

export const testGameState: GameState = {
  /*entities: {
    byId: {
      '2200': testAct,
      '2314': testAgenda,
      '1002': {
        ...InvestigatorS,
        threatArea: [testEnemy.id, testEnemy2.id],
        controlledAssets: [
          cardA.id,
          cardA5.id,
          cardA2.id,
          cardA3.id,
          cardA4.id,
          cardA.id,
          cardA.id,
        ],
        hand: [cardA.id, cardS.id, cardE.id],
      },
      '1119': testEnemy,
      '1118': testEnemy2,
      '1': cardE,
      '2': cardA,
      '3': cardA2,
      '4': cardA3,
      '5': cardA4,
      '6': cardA5,
      '7': cardS,
    },
    allIds: [testAct.id, testAgenda.id, InvestigatorS.id],
  },
  */
  map: testGameMap,
  acts: [testAct.id],
  agendas: [testAgenda.id],
  investigators: [InvestigatorS.id],
  availableActions: testActions,
  currentInvestigator: InvestigatorS.id,
};
