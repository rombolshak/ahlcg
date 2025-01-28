import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { PlayerCardBase } from 'models/player-card.model';
import { WithAhSymbolsPipe } from 'pipes/with-ah-symbols.pipe';
import { CardOutlineDirective } from 'directives/card-outline.directive';
import { CardBackgroundDirective } from 'directives/card-background.directive';

@Component({
  selector: 'ah-asset-popover',
  imports: [WithAhSymbolsPipe, CardOutlineDirective, CardBackgroundDirective],
  templateUrl: './asset-popover.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AssetPopoverComponent {
  readonly asset = input.required<PlayerCardBase>();
}
