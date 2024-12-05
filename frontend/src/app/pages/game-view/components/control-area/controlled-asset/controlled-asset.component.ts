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
import { VitalsBarComponent } from '../../../../../components/vitals-bar/vitals-bar.component';
import { AssetDetailIconComponent } from './asset-detail-icon/asset-detail-icon.component';

@Component({
  selector: 'ah-controlled-asset',
  imports: [NgOptimizedImage, VitalsBarComponent, AssetDetailIconComponent],
  template: `
    <div class="flex flex-col justify-between relative w-full h-full">
      <img
        [ngSrc]="imagesService.getMiniIllustration(asset().setInfo)"
        fill
        class="-z-10 rounded"
      />

      <ah-vitals-bar [asset]="asset()" [state]="state()"></ah-vitals-bar>
      <div class="bg-gray-950/50 flex justify-center items-center">
        <ah-asset-detail-icon
          [detail]="asset().slot"
          [image]="
            imagesService.getOverlay(CreateOverlay.cardSlot(asset().slot))
          "
          [withoutText]="true"
        ></ah-asset-detail-icon>
        <ah-asset-detail-icon
          [detail]="asset().additionalSlot"
          [image]="
            imagesService.getOverlay(
              CreateOverlay.cardSlot(asset().additionalSlot)
            )
          "
          [withoutText]="true"
        ></ah-asset-detail-icon>
        <ah-asset-detail-icon
          [detail]="state()?.resources"
          [image]="imagesService.getSimpleOverlay('resource')"
        ></ah-asset-detail-icon>
        <ah-asset-detail-icon
          [detail]="state()?.clues"
          [image]="imagesService.getSimpleOverlay('clue')"
        ></ah-asset-detail-icon>
        <ah-asset-detail-icon
          [detail]="state()?.doom"
          [image]="imagesService.getSimpleOverlay('doom')"
        ></ah-asset-detail-icon>
      </div>
    </div>
  `,
  styles: ``,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ControlledAssetComponent {
  asset = input.required<AssetCard>();
  state = input<AssetState>();
  protected imagesService = inject(ImagesUrlService);
  protected readonly CreateOverlay = CreateOverlay;
}
