import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { LeftPanelComponent } from './left-panel/left-panel.component';
import { CentralViewComponent } from './central-view/central-view.component';
import { RightPanelComponent } from './right-panel/right-panel.component';
import { GameStateService } from './services/game-state.service';

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
  readonly gameState = this.gameStateService.state;
}
