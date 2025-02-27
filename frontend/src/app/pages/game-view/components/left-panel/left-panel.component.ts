import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { ThreatAreaComponent } from './threat-area/threat-area.component';
import { EnemyWithState } from '../../../../shared/domain/enemy.model';

@Component({
  selector: 'ah-left-panel',
  imports: [ThreatAreaComponent],
  templateUrl: './left-panel.component.html',
  host: {
    class: 'flex',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LeftPanelComponent {
  readonly threatArea = input.required<EnemyWithState[]>();
}
