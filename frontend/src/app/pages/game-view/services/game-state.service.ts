import { Injectable, signal } from '@angular/core';
import { GameState } from 'shared/domain/game-state';

@Injectable({
  providedIn: 'root',
})
export class GameStateService {
  private readonly _state = signal<GameState | undefined>(undefined);
  public readonly state = this._state.asReadonly();

  public update(newState: GameState): void {
    this._state.set(newState);
  }
}
