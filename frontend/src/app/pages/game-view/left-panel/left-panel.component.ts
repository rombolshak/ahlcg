import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { ThreatAreaComponent } from './threat-area/threat-area.component';
import { InvestigatorComponent } from './investigator/investigator.component';
import { InvestigatorWithState } from 'shared/domain/investigator.model';

@Component({
  selector: 'ah-left-panel',
  imports: [ThreatAreaComponent, InvestigatorComponent],
  templateUrl: './left-panel.component.html',
  host: {
    class: 'flex flex-col gap-4',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LeftPanelComponent {
  readonly investigator = input.required<InvestigatorWithState>();
}
