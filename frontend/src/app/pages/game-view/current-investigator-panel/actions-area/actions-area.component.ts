import { ChangeDetectionStrategy, Component } from '@angular/core';
import { TranslocoDirective } from '@jsverse/transloco';
import { SvgComponent } from '@shared/components/svg/svg.component';
import { WithAhSymbolsPipe } from '@shared/pipes/with-ah-symbols.pipe';

@Component({
  selector: 'ah-actions-area',
  imports: [WithAhSymbolsPipe, SvgComponent, TranslocoDirective],
  templateUrl: './actions-area.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'flex flex-col justify-between gap-4 p-4 bg-base-200/70 rounded',
  },
})
// eslint-disable-next-line
export class ActionsAreaComponent {}
