import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
} from '@angular/core';
import { ScenarioNameComponent } from './scenario-name/scenario-name.component';
import { CurrentGamePhaseComponent } from './current-game-phase/current-game-phase.component';
import { GlobalGameActionsComponent } from './global-game-actions/global-game-actions.component';
import { GameStateStore } from '../../store/game-state.store';

@Component({
  selector: 'ah-game-header',
  imports: [
    ScenarioNameComponent,
    CurrentGamePhaseComponent,
    GlobalGameActionsComponent,
  ],
  templateUrl: './game-header.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class:
      'grid grid-cols-subgrid text-base-content bg-gradient-to-b from-base-200 via-base-200/80 via-[65%] to-base-200/0',
  },
})
export class GameHeaderComponent {
  private readonly state = inject(GameStateStore).gameState;

  protected readonly campaignId = computed(
    () => this.state()?.campaignId ?? '',
  );
  protected readonly scenarioId = computed(
    () => this.state()?.scenarioId ?? '',
  );
}
