import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { TranslocoDirective } from '@jsverse/transloco';
import { ActionButton } from './action-button.model';
import { SvgComponent } from '@shared/components/svg/svg.component';

@Component({
  selector: 'ah-global-game-actions',
  imports: [SvgComponent, TranslocoDirective],
  templateUrl: './global-game-actions.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'flex items-center justify-end px-8',
  },
})
export class GlobalGameActionsComponent {
  readonly actions = input.required<ActionButton[]>();
}
