import { GameState } from '../game-state';
import { testAct } from './entities/test-act';
import { testAgenda } from './entities/test-agenda';
import {
  cardA,
  cardA2,
  cardA3,
  cardA4,
  cardA5,
  cardA6,
  cardE,
  cardS,
} from './entities/test-cards';
import { testEnemy, testEnemy2 } from './entities/test-enemies';
import { InvestigatorG, InvestigatorS } from './entities/test-investigators';
import {
  testLocation,
  testLocation2,
  testLocation3,
} from './entities/test-locations';
import { testActions } from './test-actions';
import { testGameMap } from './test-game-map';
import { testMetaInfo } from './test-meta';

export const testGameState: GameState = {
  metaInfo: testMetaInfo,
  scenarioMap: testGameMap,
  acts: [testAct.id],
  agendas: [testAgenda.id],
  investigators: [InvestigatorS.id, InvestigatorG.id],
  availableActions: testActions,
  currentInvestigator: InvestigatorG.id,
  gameEntities: {
    '2200': testAct,
    '2314': testAgenda,
    '2126': testLocation,
    '2128': testLocation2,
    '2129': testLocation3,
    '1003': InvestigatorG,
    '1002': InvestigatorS,
    '1119': testEnemy,
    '1118': testEnemy2,
    '1': cardE,
    '2': cardA,
    '3': cardA2,
    '4': cardA3,
    '5': cardA4,
    '6': cardA5,
    '7': cardA6,
    '8': cardS,
  },
};
