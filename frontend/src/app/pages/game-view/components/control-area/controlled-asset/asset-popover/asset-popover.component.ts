import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { PlayerCardBase } from 'shared/domain/player-card.model';
import { WithAhSymbolsPipe } from 'shared/ui/pipes/with-ah-symbols.pipe';
import { CardOutlineDirective } from 'shared/ui/directives/card-outline.directive';
import { CardBackgroundDirective } from 'shared/ui/directives/card-background.directive';

@Component({
  selector: 'ah-asset-popover',
  imports: [WithAhSymbolsPipe, CardOutlineDirective, CardBackgroundDirective],
  templateUrl: './asset-popover.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AssetPopoverComponent {
  readonly asset = input.required<PlayerCardBase>();
}
