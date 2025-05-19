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
import { createPatch } from 'rfc6902';

@Component({
  selector: 'ah-debug-panel',
  imports: [FormsModule, JsonEditorComponent],
  templateUrl: './debug-panel.component.html',
  styles: ``,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'absolute w-full h-full top-0 left-0 cursor-reset',
  },
})
export class DebugPanelComponent {
  private readonly gameStateService = inject(GameStateStore);

  readonly gameState = linkedSignal(() => this.gameStateService.gameState());
  stateErrors = '';

  validateState(data: GameState | null): ValidationError[] {
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
      const stateErrors = this.validateState(this.gameState());
      this.stateErrors = stateErrors
        .map((e) => `${e.path.toString()}: ${e.message}`)
        .join('\n');

      const patch = createPatch(
        this.gameStateService.gameState(),
        this.gameState(),
      );

      this.gameStateService.updateState(patch);
    } catch (e: unknown) {
      if (e instanceof Error) {
        this.stateErrors = e.message;
      }
    }
  }
}
