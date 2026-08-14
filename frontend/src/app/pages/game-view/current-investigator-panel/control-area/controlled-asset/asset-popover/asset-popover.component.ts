import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { PlayerCardBase } from '@domain/entities/player-card.model';
import { CardBackgroundDirective } from '@shared/directives/cards/card-background.directive';
import { CardOutlineDirective } from '@shared/directives/cards/card-outline.directive';
import { CardDetailsTextComponent } from '../../../../components/card-details-text/card-details-text.component';

@Component({
  selector: 'ah-asset-popover',
  imports: [CardOutlineDirective, CardBackgroundDirective, CardDetailsTextComponent],
  templateUrl: './asset-popover.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AssetPopoverComponent {
  readonly asset = input.required<PlayerCardBase>();
}
