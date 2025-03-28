import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from '@angular/core';
import { Enemy } from 'shared/domain/enemy.model';
import { EnemyAvatarComponent } from '../../components/enemy-avatar/enemy-avatar.component';

@Component({
  selector: 'ah-threat-area',
  imports: [EnemyAvatarComponent],
  templateUrl: './threat-area.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class:
      'flex w-full h-fit flex-wrap gap-x-2 gap-y-1 outline outline-2 outline-gray-600 bg-gray-950/40 rounded',
  },
})
export class ThreatAreaComponent {
  readonly threatArea = input.required<Enemy[]>();

  protected readonly massiveEnemies = computed(() =>
    this.threatArea().filter((e) => e.isMassive),
  );
  protected readonly normalEnemies = computed(() =>
    this.threatArea().filter((e) => !e.isMassive),
  );
}
