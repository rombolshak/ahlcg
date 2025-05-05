import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
} from '@angular/core';
import { ThreatAreaComponent } from './threat-area/threat-area.component';
import { InvestigatorComponent } from './investigator/investigator.component';
import { ActionsSelectorComponent } from './actions-selector/actions-selector.component';
import {
  EnemiesStore,
  GameStateStore,
  InvestigatorsStore,
} from '../store/store';

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
  private readonly state = inject(GameStateStore);
  private readonly investigators = inject(InvestigatorsStore);
  private readonly enemies = inject(EnemiesStore);

  readonly investigator = computed(() => {
    if (this.state.value() === null) {
      return null;
    }

    const id = this.state.value()?.currentInvestigator;
    if (!id) {
      throw new Error('No current investigator in state');
    }

    const model = this.investigators.entityMap()[id];
    if (!model) {
      throw new Error('No investigator in store');
    }

    return model;
  });

  readonly threatArea = computed(() => {
    if (this.investigator() === null) {
      return [];
    }

    const ids = this.investigator()?.threatArea;
    if (!ids) {
      return [];
    }

    return this.enemies.entities().filter((e) => ids.includes(e.id));
  });

  readonly actions = computed(() => {
    return this.state.value()?.availableActions ?? [];
  });
}
