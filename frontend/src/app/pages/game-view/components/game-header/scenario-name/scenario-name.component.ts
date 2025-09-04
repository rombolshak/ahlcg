import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'ah-scenario-name',
  imports: [],
  templateUrl: './scenario-name.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'flex flex-col items-center justify-center pl-8',
  },
})
export class ScenarioNameComponent {
  readonly campaignName = input.required<string>();
  readonly scenarioName = input.required<string>();
}
