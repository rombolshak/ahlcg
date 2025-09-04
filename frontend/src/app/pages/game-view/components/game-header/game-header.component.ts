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
  styleUrl: './game-header.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'grid grid-cols-subgrid text-base-content',
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
