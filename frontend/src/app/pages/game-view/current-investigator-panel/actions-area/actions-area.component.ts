import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { InvestigatorAction } from '@domain/action.model';
import { TranslocoDirective } from '@jsverse/transloco';
import { ActionAreaButtonsComponent } from '@pages/game-view/current-investigator-panel/actions-area/action-area-buttons/action-area-buttons.component';
import { InvestigatorActionsComponent } from '@pages/game-view/current-investigator-panel/actions-area/investigator-actions/investigator-actions.component';

@Component({
  selector: 'ah-actions-area',
  imports: [
    TranslocoDirective,
    InvestigatorActionsComponent,
    ActionAreaButtonsComponent,
  ],
  templateUrl: './actions-area.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class:
      'flex flex-col justify-between gap-4 p-4 bg-base-200/70 rounded font-[ArnoPro]',
  },
})
export class ActionsAreaComponent {
  readonly actions = input.required<InvestigatorAction[]>();
}
