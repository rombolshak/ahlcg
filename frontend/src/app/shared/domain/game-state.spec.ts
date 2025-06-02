/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { gameState } from './game-state';
import { testGameState } from './test/test-game-state';
import { ArkErrors } from 'arktype';
import { produce } from 'immer';
import {
  actId,
  agendaId,
  assetId,
  enemyId,
  investigatorId,
  locationId,
} from './entities/id.model';
import { Investigator } from './entities/investigator.model';

describe('GameState', () => {
  it('should accept valid state', () => {
    const state = gameState(testGameState);

    expect(state).not.toBeInstanceOf(ArkErrors);
  });

  it('should show error for connection same from and to', () => {
    const testState = produce(testGameState, (state) => {
      const connection = state.scenarioMap.connections[0];

      expect(connection).toBeTruthy();
      connection!.from = connection!.to;
    });

    const validated = gameState(testState);

    expect(validated).toBeInstanceOf(ArkErrors);
    expect((validated as ArkErrors).summary).toContain(
      'Illegal connection to the same location',
    );
  });

  it('should show error for invalid connection from', () => {
    const testState = produce(testGameState, (state) => {
      const connection = state.scenarioMap.connections[0];

      expect(connection).toBeTruthy();
      connection!.from = locationId.assert('1234');
    });

    const validated = gameState(testState);

    expect(validated).toBeInstanceOf(ArkErrors);
    expect((validated as ArkErrors).summary).toContain(
      '1234 is not specified in map',
    );
  });

  it('should show error for invalid connection to', () => {
    const testState = produce(testGameState, (state) => {
      const connection = state.scenarioMap.connections[0];

      expect(connection).toBeTruthy();
      connection!.to = locationId.assert('1234');
    });

    const validated = gameState(testState);

    expect(validated).toBeInstanceOf(ArkErrors);
    expect((validated as ArkErrors).summary).toContain(
      '1234 is not specified in map',
    );
  });

  it('should show error for non existent investigator in location', () => {
    const testState = produce(testGameState, (state) => {
      const place = state.scenarioMap.places[0];

      expect(place).toBeTruthy();
      place!.investigators = [investigatorId.assert('1234')];
    });

    const validated = gameState(testState);

    expect(validated).toBeInstanceOf(ArkErrors);
    expect((validated as ArkErrors).summary).toContain('does not exists');
  });

  it('should show error for invalid investigator in location', () => {
    const testState = produce(testGameState, (state) => {
      const place = state.scenarioMap.places[0];

      expect(place).toBeTruthy();
      place!.investigators = [investigatorId.assert('2129')];
    });

    const validated = gameState(testState);

    expect(validated).toBeInstanceOf(ArkErrors);
    expect((validated as ArkErrors).summary).toContain('must be investigator');
  });

  it('should show error for non existent location in place', () => {
    const testState = produce(testGameState, (state) => {
      const place = state.scenarioMap.places[0];

      expect(place).toBeTruthy();
      place!.location = locationId.assert('1234');
    });

    const validated = gameState(testState);

    expect(validated).toBeInstanceOf(ArkErrors);
    expect((validated as ArkErrors).summary).toContain('does not exists');
  });

  it('should show error for invalid location in place', () => {
    const testState = produce(testGameState, (state) => {
      const place = state.scenarioMap.places[0];

      expect(place).toBeTruthy();
      place!.location = locationId.assert('1003');
    });

    const validated = gameState(testState);

    expect(validated).toBeInstanceOf(ArkErrors);
    expect((validated as ArkErrors).summary).toContain('must be location');
  });

  it('should show error for non existent asset of investigator', () => {
    const testState = produce(testGameState, (state) => {
      const investigator = state.gameEntities['1003'] as Investigator;

      expect(investigator).toBeTruthy();
      investigator.controlledAssets = [assetId.assert('1234')];
    });

    const validated = gameState(testState);

    expect(validated).toBeInstanceOf(ArkErrors);
    expect((validated as ArkErrors).summary).toContain('does not exists');
  });

  it('should show error for invalid asset of investigator', () => {
    const testState = produce(testGameState, (state) => {
      const investigator = state.gameEntities['1003'] as Investigator;

      expect(investigator).toBeTruthy();
      investigator.controlledAssets = [assetId.assert('7')];
    });

    const validated = gameState(testState);

    expect(validated).toBeInstanceOf(ArkErrors);
    expect((validated as ArkErrors).summary).toContain('must be asset');
  });

  it('should show error for non existent hand of investigator', () => {
    const testState = produce(testGameState, (state) => {
      const investigator = state.gameEntities['1003'] as Investigator;

      expect(investigator).toBeTruthy();
      investigator.hand = [assetId.assert('1234')];
    });

    const validated = gameState(testState);

    expect(validated).toBeInstanceOf(ArkErrors);
    expect((validated as ArkErrors).summary).toContain('does not exists');
  });

  it('should show error for invalid hand of investigator', () => {
    const testState = produce(testGameState, (state) => {
      const investigator = state.gameEntities['1003'] as Investigator;

      expect(investigator).toBeTruthy();
      investigator.hand = [assetId.assert('2129')];
    });

    const validated = gameState(testState);

    expect(validated).toBeInstanceOf(ArkErrors);
    expect((validated as ArkErrors).summary).toContain(
      'must be asset or skill or event',
    );
  });

  it('should show error for non existent enemy of investigator', () => {
    const testState = produce(testGameState, (state) => {
      const investigator = state.gameEntities['1003'] as Investigator;

      expect(investigator).toBeTruthy();
      investigator.threatArea = [enemyId.assert('1234')];
    });

    const validated = gameState(testState);

    expect(validated).toBeInstanceOf(ArkErrors);
    expect((validated as ArkErrors).summary).toContain('does not exists');
  });

  it('should show error for invalid enemy of investigator', () => {
    const testState = produce(testGameState, (state) => {
      const investigator = state.gameEntities['1003'] as Investigator;

      expect(investigator).toBeTruthy();
      investigator.threatArea = [enemyId.assert('7')];
    });

    const validated = gameState(testState);

    expect(validated).toBeInstanceOf(ArkErrors);
    expect((validated as ArkErrors).summary).toContain('must be enemy');
  });

  it('should show error for non existent investigator', () => {
    const testState = produce(testGameState, (state) => {
      state.investigators = [investigatorId.assert('1234')];
    });

    const validated = gameState(testState);

    expect(validated).toBeInstanceOf(ArkErrors);
    expect((validated as ArkErrors).summary).toContain('does not exists');
  });

  it('should show error for invalid investigator', () => {
    const testState = produce(testGameState, (state) => {
      state.investigators = [investigatorId.assert('2129')];
    });

    const validated = gameState(testState);

    expect(validated).toBeInstanceOf(ArkErrors);
    expect((validated as ArkErrors).summary).toContain('must be investigator');
  });

  it('should show error for non existent current investigator', () => {
    const testState = produce(testGameState, (state) => {
      state.currentInvestigator = investigatorId.assert('1234');
    });

    const validated = gameState(testState);

    expect(validated).toBeInstanceOf(ArkErrors);
    expect((validated as ArkErrors).summary).toContain('does not exists');
  });

  it('should show error for invalid current investigator', () => {
    const testState = produce(testGameState, (state) => {
      state.currentInvestigator = investigatorId.assert('2129');
    });

    const validated = gameState(testState);

    expect(validated).toBeInstanceOf(ArkErrors);
    expect((validated as ArkErrors).summary).toContain('must be investigator');
  });

  it('should show error for non existent act', () => {
    const testState = produce(testGameState, (state) => {
      state.acts = [actId.assert('1234')];
    });

    const validated = gameState(testState);

    expect(validated).toBeInstanceOf(ArkErrors);
    expect((validated as ArkErrors).summary).toContain('does not exists');
  });

  it('should show error for invalid act', () => {
    const testState = produce(testGameState, (state) => {
      state.acts = [actId.assert('1003')];
    });

    const validated = gameState(testState);

    expect(validated).toBeInstanceOf(ArkErrors);
    expect((validated as ArkErrors).summary).toContain('must be act');
  });

  it('should show error for non existent agenda', () => {
    const testState = produce(testGameState, (state) => {
      state.agendas = [agendaId.assert('1234')];
    });

    const validated = gameState(testState);

    expect(validated).toBeInstanceOf(ArkErrors);
    expect((validated as ArkErrors).summary).toContain('does not exists');
  });

  it('should show error for invalid agenda', () => {
    const testState = produce(testGameState, (state) => {
      state.agendas = [agendaId.assert('1003')];
    });

    const validated = gameState(testState);

    expect(validated).toBeInstanceOf(ArkErrors);
    expect((validated as ArkErrors).summary).toContain('must be agenda');
  });
});
