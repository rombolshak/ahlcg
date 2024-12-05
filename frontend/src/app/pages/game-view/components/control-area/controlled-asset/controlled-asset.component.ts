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
    AssetPopoverComponent,
  ],
  template: `
    <div class="flex flex-col justify-between w-full h-full relative peer">
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

    <ah-asset-popover
      [asset]="asset()"
      class="opacity-0 w-60 transition-opacity absolute left-[70%] top-[40%] -z-50 peer-hover:opacity-100 peer-hover:z-50 hover:opacity-100 hover:z-50"
    ></ah-asset-popover>
  `,
  styles: `
    :host {
      @apply relative;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ControlledAssetComponent {
  asset = input.required<AssetCard>();
  state = input<AssetState>();
  protected imagesService = inject(ImagesUrlService);
  protected readonly CreateOverlay = CreateOverlay;
}
