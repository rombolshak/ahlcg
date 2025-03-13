import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { AgendaComponent } from '../left-panel/agenda/agenda.component';
import { ActComponent } from '../left-panel/act/act.component';
import { Agenda } from 'shared/domain/agenda.model';
import { Act } from 'shared/domain/act.model';

@Component({
  selector: 'ah-right-panel',
  imports: [AgendaComponent, ActComponent],
  templateUrl: './right-panel.component.html',
  styles: ``,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RightPanelComponent {
  readonly agenda = input.required<Agenda>();
  readonly act = input.required<Act>();
}
