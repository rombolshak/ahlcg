import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { Enemy } from 'shared/domain/entities/enemy.model';
import { InvestigatorThreatItemComponent } from './investigator-threat-item/investigator-threat-item.component';

@Component({
  selector: 'ah-threat-area',
  imports: [InvestigatorThreatItemComponent],
  templateUrl: './threat-area.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class:
      'flex flex-col gap-2 p-4 -z-45 bg-red-700/20 outline outline-2 outline-gray-600 rounded',
  },
})
export class ThreatAreaComponent {
  readonly threatArea = input.required<Enemy[]>();
}
