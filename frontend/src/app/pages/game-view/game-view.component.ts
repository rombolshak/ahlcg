import {
  ChangeDetectionStrategy,
  Component,
  HostListener,
  inject,
  OnInit,
} from '@angular/core';
import { LeftPanelComponent } from './left-panel/left-panel.component';
import { CentralViewComponent } from './central-view/central-view.component';
import { RightPanelComponent } from './right-panel/right-panel.component';
import { DebugPanelComponent } from './debug-panel/debug-panel.component';
import { testGameState } from '../../shared/domain/test/test-game-state';
import { testAct } from '../../shared/domain/test/entities/test-act';
import { testAgenda } from '../../shared/domain/test/entities/test-agenda';
import {
  InvestigatorG,
  InvestigatorS,
} from '../../shared/domain/test/entities/test-investigators';
import {
  testEnemy,
  testEnemy2,
} from '../../shared/domain/test/entities/test-enemies';
import {
  cardA,
  cardA2,
  cardA3,
  cardA4,
  cardA5,
  cardE,
  cardS,
} from '../../shared/domain/test/entities/test-cards';
import { GameStateStore } from './store/game-state.store';
import {
  testLocation,
  testLocation2,
  testLocation3,
} from '../../shared/domain/test/entities/test-locations';

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
export class GameViewComponent implements OnInit {
  constructor() {
    console.log(JSON.stringify(testGameState));
  }

  readonly gameState = inject(GameStateStore);

  showDebug = false;

  public ngOnInit() {
    this.gameState.addEntities([
      testAct,
      testAgenda,
      testLocation,
      testLocation2,
      testLocation3,
      InvestigatorG,
      InvestigatorS,
      testEnemy,
      testEnemy2,
      cardE,
      cardA,
      cardA2,
      cardA3,
      cardA4,
      cardA5,
      cardS,
    ]);
    console.log(this.gameState.getAgenda(testAgenda.id));
    this.gameState.updateState(testGameState);
  }

  @HostListener('body:keydown.`')
  toggleDebug() {
    this.showDebug = !this.showDebug;
  }
}
