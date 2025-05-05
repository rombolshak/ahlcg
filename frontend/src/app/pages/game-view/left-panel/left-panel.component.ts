import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { ThreatAreaComponent } from './threat-area/threat-area.component';
import { InvestigatorComponent } from './investigator/investigator.component';
import { Investigator } from 'shared/domain/entities/investigator.model';
import { ActionsSelectorComponent } from './actions-selector/actions-selector.component';

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
  readonly investigator = input.required<Investigator>();
}
