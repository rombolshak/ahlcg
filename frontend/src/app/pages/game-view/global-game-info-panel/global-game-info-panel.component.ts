import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
} from '@angular/core';
import { GameStateStore } from '../store/game-state.store';
import { ActComponent } from './act/act.component';
import { AgendaComponent } from './agenda/agenda.component';

@Component({
  selector: 'ah-global-game-info-panel',
  imports: [AgendaComponent, ActComponent],
  templateUrl: './global-game-info-panel.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'flex flex-col gap-4',
  },
})
export class GlobalGameInfoPanelComponent {
  private readonly state = inject(GameStateStore);

  readonly agendas = computed(() => {
    if (this.state.gameState() === null) {
      return [];
    }

    const agendas = this.state.gameState()?.agendas;
    if (agendas === undefined) {
      throw new Error('No agenda in state');
    }

    return agendas.map((a) => this.state.getAgenda(a));
  });

  readonly acts = computed(() => {
    if (this.state.gameState() === null) {
      return [];
    }

    const agendas = this.state.gameState()?.acts;
    if (agendas === undefined) {
      throw new Error('No agenda in state');
    }

    return agendas.map((a) => this.state.getAct(a));
  });
}
