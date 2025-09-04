import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { TranslocoDirective } from '@jsverse/transloco';

@Component({
  selector: 'ah-scenario-name',
  imports: [TranslocoDirective],
  templateUrl: './scenario-name.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'flex flex-col items-center justify-center text-center pl-8',
  },
})
export class ScenarioNameComponent {
  readonly campaignId = input.required<string>();
  readonly scenarioId = input.required<string>();
}
