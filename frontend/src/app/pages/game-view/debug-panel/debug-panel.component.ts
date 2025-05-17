import {
  ChangeDetectionStrategy,
  Component,
  inject,
  linkedSignal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { GameState, gameState } from 'shared/domain/game-state';
import { ArkErrors } from 'arktype';
import { GameStateStore } from '../store/game-state.store';
import { JsonEditorComponent } from 'shared/ui/components/json-editor/json-editor.component';
import { ValidationError, ValidationSeverity } from 'vanilla-jsoneditor';

@Component({
  selector: 'ah-debug-panel',
  imports: [FormsModule, JsonEditorComponent],
  templateUrl: './debug-panel.component.html',
  styles: ``,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DebugPanelComponent {
  private gameStateService = inject(GameStateStore);

  readonly gameState = linkedSignal(() => this.gameStateService.state());
  stateErrors = '';

  validateState(data: GameState): ValidationError[] {
    const newState = gameState(data);
    if (newState instanceof ArkErrors) {
      return newState
        .entries()
        .map(
          (e) =>
            ({
              path: e[1].path
                .entries()
                .map((v) => v[1].toString())
                .toArray(),
              message: e[1].message,
              severity: ValidationSeverity.error,
            }) satisfies ValidationError,
        )
        .toArray();
    }

    return [];
  }

  updateGameState() {
    this.stateErrors = '';
    try {
      const obj = this.gameState();
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
