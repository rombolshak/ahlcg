import { Injectable } from '@angular/core';
import { GameState, gameState } from 'shared/domain/game-state';
import { httpResource } from '@angular/common/http';
import { ArkErrors } from 'arktype';

@Injectable({
  providedIn: 'root',
})
export class GameStateService {
  public readonly gameState = httpResource<GameState>('/api/v1/gameState', {
    parse: (data) => {
      console.log(data);
      const value = gameState(data);
      if (value instanceof ArkErrors) {
        const error = value.toTraversalError();
        console.error(error);
        throw error;
      }

      return value;
    },
  });
}
