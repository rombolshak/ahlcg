import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DebugPanelComponent } from './debug-panel.component';
import { provideExperimentalZonelessChangeDetection } from '@angular/core';
import { testGameState } from '../../../shared/domain/test/test-game-state';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { GameStateStore } from '../store/game-state.store';

describe('DebugPanelComponent', () => {
  let component: DebugPanelComponent;
  let fixture: ComponentFixture<DebugPanelComponent>;
  let mockGameStateService: InstanceType<typeof GameStateStore>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DebugPanelComponent],
      providers: [
        provideExperimentalZonelessChangeDetection(),
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    }).compileComponents();

    mockGameStateService = TestBed.inject(GameStateStore);
    fixture = TestBed.createComponent(DebugPanelComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should update game state', () => {
    component.gameState.set(testGameState);
    component.updateGameState();

    expect(component.stateErrors).toBe('');
    expect(mockGameStateService.gameState()).toEqual(testGameState);
  });
});
