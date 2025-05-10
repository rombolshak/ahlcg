import { GameMap } from '../game-map.model';
import {
  testLocation,
  testLocation2,
  testLocation3,
} from './entities/test-locations';
import { InvestigatorS } from './entities/test-investigators';

export const testGameMap: GameMap = {
  height: 6,
  width: 6,
  places: [
    {
      x: 2,
      y: 3,
      location: testLocation.id,
      investigators: [InvestigatorS.id, InvestigatorS.id],
    },
    {
      x: 4,
      y: 2,
      location: testLocation2.id,
      investigators: [],
    },
    {
      x: 4,
      y: 4,
      location: testLocation3.id,
      investigators: [],
    },
  ],
  connections: [
    { from: testLocation.id, to: testLocation2.id },
    { from: testLocation.id, to: testLocation3.id },
  ],
};
