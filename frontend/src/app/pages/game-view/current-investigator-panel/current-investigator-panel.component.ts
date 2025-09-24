import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
} from '@angular/core';
import { GameStateStore } from '../store/game-state.store';
import { ControlAreaComponent } from './control-area/control-area.component';
import { InvestigatorComponent } from './investigator/investigator.component';
import { ThreatAreaComponent } from './threat-area/threat-area.component';

@Component({
  selector: 'ah-current-investigator-panel',
  imports: [ThreatAreaComponent, InvestigatorComponent, ControlAreaComponent],
  templateUrl: './current-investigator-panel.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'flex flex-col gap-4',
  },
})
export class CurrentInvestigatorPanelComponent {
  readonly state = inject(GameStateStore);

  readonly threatArea = computed(() => {
    const ids = this.state.currentInvestigator()?.threatArea;
    if (!ids) {
      return [];
    }

    return ids.map((i) => this.state.getEnemy(i));
  });

  readonly actions = computed(() => {
    return this.state.gameState()?.availableActions ?? [];
  });

  readonly assets = computed(() => {
    return (
      this.state
        .currentInvestigator()
        ?.controlledAssets.map((a) => this.state.getAsset(a)) ?? []
    );
  });
}
