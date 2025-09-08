import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { SvgComponent } from 'shared/ui/components/svg/svg.component';
import { TranslocoDirective } from '@jsverse/transloco';
import { ActionButton } from './action-button.model';

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
