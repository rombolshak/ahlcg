import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { ScopedTranslocoDirective } from '@core/i18n/scoped-transloco.directive';
import { InvestigatorAction } from '@domain/action.model';
import { WithAhSymbolsPipe } from '@ui/pipes/with-ah-symbols.pipe';
import { ACTIONS_AREA_I18N_SCOPE } from '../../i18n/scope';

@Component({
  selector: 'ah-action-tooltip',
  imports: [ScopedTranslocoDirective, WithAhSymbolsPipe],
  templateUrl: './action-tooltip.component.html',
  styles: ``,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ActionTooltipComponent {
  protected readonly scope = ACTIONS_AREA_I18N_SCOPE;

  readonly action = input.required<InvestigatorAction>();
}
