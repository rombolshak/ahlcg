import { ChangeDetectionStrategy, Component } from '@angular/core';
import { TranslocoDirective } from '@jsverse/transloco';
import { SvgComponent } from '@shared/components/svg/svg.component';
import { WithAhSymbolsPipe } from '@shared/pipes/with-ah-symbols.pipe';

@Component({
  selector: 'ah-action-area-buttons',
  imports: [SvgComponent, TranslocoDirective, WithAhSymbolsPipe],
  templateUrl: './action-area-buttons.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'flex gap-1',
  },
})
export class ActionAreaButtonsComponent {
  protected readonly buttons = [
    {
      icon: 'cards-draw',
      tooltip: 'draw_card',
      enabled: true,
    },
    {
      icon: 'resource',
      tooltip: 'take_resource',
      enabled: true,
    },
    {
      icon: 'cards-pile',
      tooltip: 'view_discard',
      enabled: false,
    },
  ];
}
