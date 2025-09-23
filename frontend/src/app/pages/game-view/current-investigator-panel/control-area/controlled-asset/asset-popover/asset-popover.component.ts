import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { PlayerCardBase } from 'shared/domain/entities/player-card.model';
import { CardBackgroundDirective } from 'shared/ui/directives/card-background.directive';
import { CardOutlineDirective } from 'shared/ui/directives/card-outline.directive';
import { CardDetailsTextComponent } from '../../../../components/card-details-text/card-details-text.component';

@Component({
  selector: 'ah-asset-popover',
  imports: [
    CardOutlineDirective,
    CardBackgroundDirective,
    CardDetailsTextComponent,
  ],
  templateUrl: './asset-popover.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AssetPopoverComponent {
  readonly asset = input.required<PlayerCardBase>();
}
