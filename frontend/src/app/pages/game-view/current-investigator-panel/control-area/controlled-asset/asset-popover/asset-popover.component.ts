import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { PlayerCardBase } from '@domain/entities/player-card.model';
import { CardBackgroundDirective } from '@ui/game/directives/cards/card-background.directive';
import { CardOutlineDirective } from '@ui/game/directives/cards/card-outline.directive';
import { CardDetailsTextComponent } from '../../../../card-details-text/card-details-text.component';

@Component({
  selector: 'ah-asset-popover',
  imports: [CardOutlineDirective, CardBackgroundDirective, CardDetailsTextComponent],
  templateUrl: './asset-popover.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AssetPopoverComponent {
  readonly asset = input.required<PlayerCardBase>();
}
