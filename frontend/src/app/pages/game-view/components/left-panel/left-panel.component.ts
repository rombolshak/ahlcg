import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { ThreatAreaComponent } from './threat-area/threat-area.component';
import { EnemyWithState } from 'shared/domain/enemy.model';
import { AgendaComponent } from './agenda/agenda.component';
import { Agenda } from 'shared/domain/agenda.model';

@Component({
  selector: 'ah-left-panel',
  imports: [ThreatAreaComponent, AgendaComponent],
  templateUrl: './left-panel.component.html',
  host: {
    class: 'flex flex-col gap-4',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LeftPanelComponent {
  readonly threatArea = input.required<EnemyWithState[]>();
  readonly agenda = input.required<Agenda>();
}
