import { NgOptimizedImage } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { ImagesUrlService } from '@core/images-url.service';
import { Investigator } from '@domain/entities/investigator.model';
import { AssetDetailIconComponent } from '@pages/game-view/current-investigator-panel/control-area/controlled-asset/asset-detail-icon/asset-detail-icon.component';
import { VitalsBarComponent } from '@ui/components/vitals-bar/vitals-bar.component';
import { CardFactionBackgroundDirective } from '@ui/directives/cards/card-faction-background.directive';
import { CardOutlineDirective } from '@ui/directives/cards/card-outline.directive';

@Component({
  selector: 'ah-investigator-avatar',
  imports: [CardOutlineDirective, NgOptimizedImage, VitalsBarComponent, AssetDetailIconComponent, CardFactionBackgroundDirective],
  templateUrl: './investigator-avatar.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InvestigatorAvatarComponent {
  protected readonly imagesService = inject(ImagesUrlService);

  readonly investigator = input.required<Investigator>();
}
