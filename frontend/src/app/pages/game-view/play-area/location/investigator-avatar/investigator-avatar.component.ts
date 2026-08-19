import { NgOptimizedImage } from '@angular/common';
import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { imageUrl } from '@domain/card-art/image-url';
import { Investigator } from '@domain/entities/investigator.model';
import { AssetDetailIconComponent } from '@pages/game-view/current-investigator-panel/control-area/controlled-asset/asset-detail-icon/asset-detail-icon.component';
import { CardFactionBackgroundDirective } from '@ui/game/directives/cards/card-faction-background.directive';
import { CardOutlineDirective } from '@ui/game/directives/cards/card-outline.directive';
import { VitalsBarComponent } from '@ui/game/vitals-bar/vitals-bar.component';

@Component({
  selector: 'ah-investigator-avatar',
  imports: [CardOutlineDirective, NgOptimizedImage, VitalsBarComponent, AssetDetailIconComponent, CardFactionBackgroundDirective],
  templateUrl: './investigator-avatar.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InvestigatorAvatarComponent {
  protected readonly imageUrl = imageUrl;

  readonly investigator = input.required<Investigator>();
}
