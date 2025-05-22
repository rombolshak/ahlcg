import { TestBed } from '@angular/core/testing';

import { DebugTimelineServiceService } from './debug-timeline-service.service';
import { GameStateStore } from '../store/game-state.store';
import { testGameState } from '../../../shared/domain/test/test-game-state';
import { InvestigatorS } from '../../../shared/domain/test/entities/test-investigators';
import { createPatch } from 'rfc6902';
import { Enemy } from '../../../shared/domain/entities/enemy.model';
import { provideExperimentalZonelessChangeDetection } from '@angular/core';

const testGameState2 = {
  ...testGameState,
  currentInvestigator: InvestigatorS.id,
};
const testGameState3 = {
  ...testGameState2,
  gameEntities: {
    ...testGameState2.gameEntities,
    ['1118']: {
      ...(testGameState2.gameEntities['1118'] as Enemy),
      health: { max: 5, damaged: 5 },
    },
  },
};

describe('GameDebugTimelineServiceService', () => {
  let service: DebugTimelineServiceService;

  let mockStore: jasmine.SpyObj<InstanceType<typeof GameStateStore>>;
  beforeEach(() => {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    mockStore = jasmine.createSpyObj('GameStateStore', [
      'updateState',
      'setState',
      'gameState',
    ]);

    mockStore.gameState.and.returnValue(testGameState);
    TestBed.configureTestingModule({
      providers: [
        provideExperimentalZonelessChangeDetection(),
        DebugTimelineServiceService,
        { provide: GameStateStore, useValue: mockStore },
      ],
    });
    service = TestBed.inject(DebugTimelineServiceService);
  });

  it('should initialize with the original state from the store', () => {
    expect(service.totalPatchesRecorded()).toBe(0);
    expect(service.currentAppliedPatch()).toBe(0);

    service.restoreOriginalState();

    expect(mockStore.setState).toHaveBeenCalledWith(testGameState);
  });

  it('should record changes and create patches', () => {
    service.recordChanges(testGameState2);

    expect(service.totalPatchesRecorded()).toBe(1);
    expect(service.currentAppliedPatch()).toBe(0);
  });

  it('should apply the next patch correctly', () => {
    service.recordChanges(testGameState2);
    service.recordChanges(testGameState3);
    service.applyNextPatch();

    expect(mockStore.updateState).toHaveBeenCalledWith(
      createPatch(testGameState, testGameState2),
    );

    expect(service.currentAppliedPatch()).toBe(1);
    expect(service.totalPatchesRecorded()).toBe(2);

    service.applyNextPatch();

    expect(mockStore.updateState).toHaveBeenCalledWith(
      createPatch(testGameState2, testGameState3),
    );

    expect(service.currentAppliedPatch()).toBe(2);
    expect(service.totalPatchesRecorded()).toBe(2);
  });

  it('should reset original state and clear patches', () => {
    service.recordChanges(testGameState3);
    service.recordChanges(testGameState2);
    service.applyNextPatch();

    mockStore.gameState.and.returnValue(testGameState3);
    service.resetOriginalState();

    expect(service.totalPatchesRecorded()).toBe(0);
    expect(service.currentAppliedPatch()).toBe(0);

    service.recordChanges(testGameState);
    service.applyNextPatch();
    service.restoreOriginalState();

    expect(mockStore.setState).toHaveBeenCalledWith(testGameState3);
  });
});
