import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
} from '@angular/core';
import { LeftPanelComponent } from './left-panel/left-panel.component';
import { CentralViewComponent } from './central-view/central-view.component';
import { RightPanelComponent } from './right-panel/right-panel.component';
import { GameStateService } from './services/game-state.service';
import { HttpErrorResponse } from '@angular/common/http';

@Component({
  selector: 'ah-game-view',
  imports: [LeftPanelComponent, CentralViewComponent, RightPanelComponent],
  templateUrl: './game-view.component.html',
  host: {
    class: 'flex gap-4 p-8 h-screen w-screen',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GameViewComponent {
  private readonly gameStateService = inject(GameStateService);

  readonly gameState = this.gameStateService.gameState.value;
  readonly loadingState = computed(() => {
    return {
      isLoading: this.gameStateService.gameState.isLoading(),
      progress: this.gameStateService.gameState.progress(),
    };
  });

  readonly loadingError = computed(() => {
    const error = this.gameStateService.gameState.error();
    if (!error) return null;

    if (error instanceof HttpErrorResponse) {
      return `Response status: ${error.statusText}. \r\nError: ${error.message}. \nDetails: ${JSON.stringify(error.error)}`;
    }

    if (error instanceof Error) {
      return `Error ${error.name}: ${error.message}`;
    }

    return JSON.stringify(error);
  });
}
