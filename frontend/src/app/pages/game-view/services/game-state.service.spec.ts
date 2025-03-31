import { TestBed } from '@angular/core/testing';

import { GameStateService } from './game-state.service';
import { testGameState } from '../../../shared/domain/test/test-game-state';
import { provideExperimentalZonelessChangeDetection } from '@angular/core';

describe('GameStateService', () => {
  let service: GameStateService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideExperimentalZonelessChangeDetection()],
    });
    service = TestBed.inject(GameStateService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should set new state', () => {
    expect(service.state()).toBeUndefined();

    service.update(testGameState);

    expect(service.state()).toEqual(testGameState);
  });
});
