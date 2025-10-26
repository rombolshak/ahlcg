import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { InvestigatorAction } from '@domain/action.model';
import { TranslocoDirective } from '@jsverse/transloco';

@Component({
  selector: 'ah-action-tooltip',
  imports: [TranslocoDirective],
  templateUrl: './action-tooltip.component.html',
  styles: ``,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ActionTooltipComponent {
  readonly action = input.required<InvestigatorAction>();
}
