import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { ScopedTranslocoDirective } from '@core/i18n/scoped-transloco.directive';
import { SvgComponent } from '@ui/kit/svg/svg.component';
import { ActionButton } from './action-button.model';
import { GLOBAL_GAME_ACTIONS_I18N_SCOPE } from './i18n/scope';

@Component({
  selector: 'ah-global-game-actions',
  imports: [SvgComponent, ScopedTranslocoDirective],
  templateUrl: './global-game-actions.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'flex items-center justify-end px-8',
  },
})
export class GlobalGameActionsComponent {
  protected readonly scope = GLOBAL_GAME_ACTIONS_I18N_SCOPE;

  readonly actions = input.required<ActionButton[]>();
}
