import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
} from '@angular/core';
import { AgendaComponent } from './agenda/agenda.component';
import { ActComponent } from './act/act.component';
import { GameStateStore } from '../store/store';

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

  readonly agendas = computed(() => {
    if (this.state.state() === null) {
      return [];
    }

    const agendas = this.state.state()?.agendas;
    if (agendas === undefined) {
      throw new Error('No agenda in state');
    }

    return agendas.map((a) => this.state.getAgenda(a));
  });

  readonly acts = computed(() => {
    if (this.state.state() === null) {
      return [];
    }

    const agendas = this.state.state()?.acts;
    if (agendas === undefined) {
      throw new Error('No agenda in state');
    }

    return agendas.map((a) => this.state.getAct(a));
  });
}
