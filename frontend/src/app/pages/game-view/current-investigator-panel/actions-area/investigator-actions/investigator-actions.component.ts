import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { InvestigatorAction } from '@domain/action.model';
import { ActionTooltipComponent } from '@pages/game-view/current-investigator-panel/actions-area/investigator-actions/action-tooltip/action-tooltip.component';
import { WithAhSymbolsPipe } from '@shared/pipes/with-ah-symbols.pipe';

@Component({
  selector: 'ah-investigator-actions',
  imports: [WithAhSymbolsPipe, ActionTooltipComponent],
  templateUrl: './investigator-actions.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'flex flex-wrap gap-1',
  },
})
export class InvestigatorActionsComponent {
  readonly actions = input.required<InvestigatorAction[]>();
}
