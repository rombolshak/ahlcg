import {
  ChangeDetectionStrategy,
  Component,
  computed,
  HostListener,
  inject,
} from '@angular/core';
import { LeftPanelComponent } from './left-panel/left-panel.component';
import { CentralViewComponent } from './central-view/central-view.component';
import { RightPanelComponent } from './right-panel/right-panel.component';
import { GameStateService } from './services/game-state.service';
import { HttpErrorResponse } from '@angular/common/http';
import { DebugPanelComponent } from './debug-panel/debug-panel.component';
import { testGameState } from '../../shared/domain/test/test-game-state';
import { GameStateStore } from './store/store';

@Component({
  selector: 'ah-game-view',
  imports: [
    LeftPanelComponent,
    CentralViewComponent,
    RightPanelComponent,
    DebugPanelComponent,
  ],
  templateUrl: './game-view.component.html',
  host: {
    class: 'flex gap-4 p-8 h-screen w-screen',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GameViewComponent {
  constructor() {
    console.log(JSON.stringify(testGameState));
  }

  private readonly gameStateService = inject(GameStateService);

  readonly gameState = inject(GameStateStore);
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

  showDebug = false;

  @HostListener('body:keydown.`')
  toggleDebug() {
    this.showDebug = !this.showDebug;
  }
}
