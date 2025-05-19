import {
  ChangeDetectionStrategy,
  Component,
  inject,
  linkedSignal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  gameEntities,
  GameEntity,
  GameState,
  gameState,
} from 'shared/domain/game-state';
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
  readonly entities = linkedSignal(() => this.gameStateService.entities());
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

  validateEntities(data: GameEntity[]): ValidationError[] {
    const entities = gameEntities(data);
    if (entities instanceof ArkErrors) {
      return entities
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
      const entitiesErrors = this.validateEntities(this.entities());

      if (stateErrors.length > 0) {
        this.stateErrors += `State errors:\n${stateErrors.map((e) => `${e.path.toString()}: ${e.message}`).join('\n')}`;
      }

      if (entitiesErrors.length > 0) {
        this.stateErrors += `\nEntities errors:\n${entitiesErrors.map((e) => `${e.path.toString()}: ${e.message}`).join('\n')}`;
      }

      if (this.stateErrors.length > 0) {
        this.stateErrors = this.stateErrors.trim();
        return;
      }

      console.log('updating state');
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      this.gameStateService.updateState(this.gameState()!);
      this.gameStateService.setAllEntities(this.entities());
    } catch (e: unknown) {
      if (e instanceof Error) {
        this.stateErrors = e.message;
      }
    }
  }
}
