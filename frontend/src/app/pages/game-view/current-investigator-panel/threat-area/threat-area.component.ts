import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from '@angular/core';
import { TranslocoDirective } from '@jsverse/transloco';
import { Enemy } from 'shared/domain/entities/enemy.model';
import { InvestigatorThreatItemComponent } from './investigator-threat-item/investigator-threat-item.component';
import { ThreatsSeverity } from './threats-severity.service';

@Component({
  selector: 'ah-threat-area',
  imports: [InvestigatorThreatItemComponent, TranslocoDirective],
  templateUrl: './threat-area.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class:
      'flex flex-col gap-2 p-4 -z-45 min-h-26 ' +
      'bg-radial bg-size-[200%_200%] from-red-600/[var(--healthSeverity)] to-blue-600/[var(--sanitySeverity)] ' +
      'data-[empty=true]:from-emerald-900/30 data-[empty=true]:to-emerald-700/30 ' +
      'outline outline-2 outline-gray-600 rounded animate-radial-move',
    '[style.--healthSeverity]': 'healthSeverity()',
    '[style.--sanitySeverity]': 'sanitySeverity()',
    '[style.--tw-gradient-from-position]': `gradientFrom() + '%'`,
    '[style.--tw-gradient-to-position]': `gradientTo() + '%'`,
    '[attr.data-empty]': 'threatArea().length === 0',
  },
})
export class ThreatAreaComponent {
  readonly threatArea = input.required<Enemy[]>();
  readonly noThreatsText = input.required<string>();
  readonly threatsSeverity = input.required<ThreatsSeverity>();

  protected readonly healthSeverity = computed(
    () => `${(this.threatsSeverity().healthSeverity * 100).toFixed(0)}%`,
  );

  protected readonly sanitySeverity = computed(
    () => `${(this.threatsSeverity().sanitySeverity * 100).toFixed(0)}%`,
  );

  protected readonly gradientFrom = computed(() => {
    return this.gradientTo() - 20;
  });

  protected readonly gradientTo = computed(() => {
    const h = this.threatsSeverity().healthSeverity;
    const s = this.threatsSeverity().sanitySeverity;
    if (h === 0 && s === 0) {
      return 70;
    }

    const ratio = (h - s) / Math.max(h, s);
    return 6.5714 * ratio * ratio + 42.6 * ratio + 51.1143;
  });
}
