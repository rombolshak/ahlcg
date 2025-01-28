import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
} from '@angular/core';
import { CreateOverlay, ImagesUrlService } from 'services/images-url.service';
import { NgOptimizedImage } from '@angular/common';
import { AssetCard } from 'models/player-card.model';
import { AssetState } from 'models/asset.state';
import { VitalsBarComponent } from 'components/vitals-bar/vitals-bar.component';
import { AssetDetailIconComponent } from './asset-detail-icon/asset-detail-icon.component';
import { AssetPopoverComponent } from './asset-popover/asset-popover.component';

@Component({
  selector: 'ah-controlled-asset',
  imports: [
    NgOptimizedImage,
    VitalsBarComponent,
    AssetDetailIconComponent,
    AssetPopoverComponent,
  ],
  templateUrl: './controlled-asset.component.html',
  host: {
    class: 'relative',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ControlledAssetComponent {
  readonly asset = input.required<AssetCard>();
  readonly state = input<AssetState>();
  protected imagesService = inject(ImagesUrlService);
  protected readonly CreateOverlay = CreateOverlay;
}
