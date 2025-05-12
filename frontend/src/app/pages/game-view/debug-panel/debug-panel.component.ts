import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { gameState, GameState } from 'shared/domain/game-state';
import { ArkErrors } from 'arktype';
import { GameStateStore } from '../store/game-state.store';

@Component({
  selector: 'ah-debug-panel',
  imports: [FormsModule],
  templateUrl: './debug-panel.component.html',
  styles: ``,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DebugPanelComponent {
  private gameStateService = inject(GameStateStore);

  gameState = '';
  stateErrors = '';

  updateGameState() {
    this.stateErrors = '';
    try {
      const obj = JSON.parse(this.gameState) as GameState;
      const newState = gameState(obj);
      if (newState instanceof ArkErrors) {
        this.stateErrors = newState
          .entries()
          .map((e) => `${e[0].toString()}: ${e[1].toString()}`)
          .toArray()
          .join('\n');
        return;
      }

      this.gameStateService.updateState(newState);
    } catch (e: unknown) {
      if (e instanceof Error) {
        this.stateErrors = e.message;
      }
    }
  }
}
