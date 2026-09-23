import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { ScopedTranslocoDirective } from '@core/i18n/scoped-transloco.directive';
import { InvestigatorAction } from '@domain/action.model';
import { ActionAreaButtonsComponent } from '@pages/game-view/current-investigator-panel/actions-area/action-area-buttons/action-area-buttons.component';
import { InvestigatorActionsComponent } from '@pages/game-view/current-investigator-panel/actions-area/investigator-actions/investigator-actions.component';
import { I18N_SCOPE } from './i18n/scope';

@Component({
  selector: 'ah-actions-area',
  imports: [ScopedTranslocoDirective, InvestigatorActionsComponent, ActionAreaButtonsComponent],
  templateUrl: './actions-area.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'flex flex-col justify-between gap-4 p-4 bg-base-200/70 rounded font-[ArnoPro]',
  },
})
export class ActionsAreaComponent {
  protected readonly scope = I18N_SCOPE;

  readonly actions = input.required<InvestigatorAction[]>();
}
