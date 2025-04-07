import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DebugPanelComponent } from './debug-panel.component';
import { provideExperimentalZonelessChangeDetection } from '@angular/core';
import { GameStateService } from '../services/game-state.service';
import SpyObj = jasmine.SpyObj;
import { testGameState } from '../../../shared/domain/test/test-game-state';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

describe('DebugPanelComponent', () => {
  let component: DebugPanelComponent;
  let fixture: ComponentFixture<DebugPanelComponent>;
  let mockGameStateService: SpyObj<GameStateService>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DebugPanelComponent],
      providers: [
        provideExperimentalZonelessChangeDetection(),
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    }).compileComponents();

    mockGameStateService = TestBed.inject(GameStateService);
    fixture = TestBed.createComponent(DebugPanelComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should update game state', () => {
    component.gameState = JSON.stringify(testGameState);
    component.updateGameState();

    expect(component.stateErrors).toBe('');
    expect(mockGameStateService.gameState.value()).toEqual(testGameState);
  });
});
