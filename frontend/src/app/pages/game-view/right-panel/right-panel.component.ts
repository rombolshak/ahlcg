import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
} from '@angular/core';
import { AgendaComponent } from './agenda/agenda.component';
import { ActComponent } from './act/act.component';
import { ActsStore, AgendaStore, GameStateStore } from '../store/store';

@Component({
  selector: 'ah-right-panel',
  imports: [AgendaComponent, ActComponent],
  templateUrl: './right-panel.component.html',
  host: {
    class: 'flex flex-col gap-4',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RightPanelComponent {
  private readonly state = inject(GameStateStore);
  private readonly agendaStore = inject(AgendaStore);
  private readonly actStore = inject(ActsStore);

  readonly agendas = computed(() => {
    if (this.state.value() === null) {
      return [];
    }

    const agendas = this.state.value()?.agendas;
    if (agendas === undefined) {
      throw new Error('No agenda in state');
    }

    return agendas
      .map((a) => this.agendaStore.entityMap()[a])
      .filter((v) => v !== undefined);
  });

  readonly acts = computed(() => {
    if (this.state.value() === null) {
      return [];
    }

    const agendas = this.state.value()?.acts;
    if (agendas === undefined) {
      throw new Error('No agenda in state');
    }

    return agendas
      .map((a) => this.actStore.entityMap()[a])
      .filter((v) => v !== undefined);
  });
}
