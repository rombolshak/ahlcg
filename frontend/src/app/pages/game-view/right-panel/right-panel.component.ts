import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { AgendaComponent } from './agenda/agenda.component';
import { ActComponent } from './act/act.component';
import { Agenda } from 'shared/domain/agenda.model';
import { Act } from 'shared/domain/act.model';

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
  readonly agenda = input.required<Agenda>();
  readonly act = input.required<Act>();
}
