import { GameMap } from '../game-map.model';
import { testLocation, testLocation2, testLocation3 } from './test-locations';
import { InvestigatorS } from './test-investigators';

export const testGameMap: GameMap = {
  height: 6,
  width: 6,
  places: [
    {
      x: 2,
      y: 3,
      location: testLocation,
      investigators: [InvestigatorS, InvestigatorS],
    },
    {
      x: 4,
      y: 2,
      location: testLocation2,
      investigators: [],
    },
    {
      x: 4,
      y: 4,
      location: testLocation3,
      investigators: [],
    },
  ],
  connections: [
    { from: 1, to: 2 },
    { from: 1, to: 3 },
  ],
};
