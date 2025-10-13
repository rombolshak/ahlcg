import { NgOptimizedImage } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
} from '@angular/core';
import { Investigator } from '@domain/entities/investigator.model';
import { AssetDetailIconComponent } from '@pages/game-view/current-investigator-panel/control-area/controlled-asset/asset-detail-icon/asset-detail-icon.component';
import { ImagesUrlService } from '@services/images-url.service';
import { VitalsBarComponent } from '@shared/components/vitals-bar/vitals-bar.component';
import { CardFactionBackgroundDirective } from '@shared/directives/card-faction-background.directive';
import { CardOutlineDirective } from '@shared/directives/card-outline.directive';

@Component({
  selector: 'ah-investigator-avatar',
  imports: [
    CardOutlineDirective,
    NgOptimizedImage,
    VitalsBarComponent,
    AssetDetailIconComponent,
    CardFactionBackgroundDirective,
  ],
  templateUrl: './investigator-avatar.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InvestigatorAvatarComponent {
  readonly investigator = input.required<Investigator>();

  protected readonly imagesService = inject(ImagesUrlService);
}
