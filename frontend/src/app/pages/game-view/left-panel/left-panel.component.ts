import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
} from '@angular/core';
import { ThreatAreaComponent } from './threat-area/threat-area.component';
import { InvestigatorComponent } from './investigator/investigator.component';
import { ActionsSelectorComponent } from './actions-selector/actions-selector.component';
import { GameStateStore } from '../store/game-state.store';

@Component({
  selector: 'ah-left-panel',
  imports: [
    ThreatAreaComponent,
    InvestigatorComponent,
    ActionsSelectorComponent,
  ],
  templateUrl: './left-panel.component.html',
  host: {
    class: 'flex flex-col gap-4',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LeftPanelComponent {
  readonly state = inject(GameStateStore);

  readonly threatArea = computed(() => {
    const ids = this.state.currentInvestigator()?.threatArea;
    if (!ids) {
      return [];
    }

    return ids.map((i) => this.state.getEnemy(i));
  });

  readonly actions = computed(() => {
    return this.state.state()?.availableActions ?? [];
  });
}
