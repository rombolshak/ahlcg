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

@Component({
  selector: 'ah-controlled-asset',
  imports: [NgOptimizedImage, VitalsBarComponent],
  template: `
    <div class="flex flex-col justify-between relative w-full h-full">
      <img
        [ngSrc]="imagesService.getMiniIllustration(asset().setInfo)"
        fill
        class="-z-10 rounded"
      />

      <ah-vitals-bar [asset]="asset()" [state]="state()"></ah-vitals-bar>
      <div class="bg-gray-950/50 flex justify-center items-center">
        @if (asset().slot) {
          <img
            [ngSrc]="
              imagesService.getOverlay(CreateOverlay.cardSlot(asset().slot!))
            "
            width="24"
            height="24"
          />
        }

        @if (asset().additionalSlot) {
          <img
            [ngSrc]="
              imagesService.getOverlay(
                CreateOverlay.cardSlot(asset().additionalSlot!)
              )
            "
            width="24"
            height="24"
          />
        }

        @if (state()?.resources) {
          <div class="relative flex justify-center items-center w-6 h-6">
            <img [ngSrc]="imagesService.getSimpleOverlay('resource')" fill />
            <span class="z-10 text-lg text-white font-teutonic">{{
              state()?.resources
            }}</span>
          </div>
        }
        @if (state()?.clues) {
          <div class="relative flex justify-center items-center w-6 h-6">
            <img [ngSrc]="imagesService.getSimpleOverlay('clue')" fill />
            <span class="z-10 text-lg text-white font-teutonic">{{
              state()?.clues
            }}</span>
          </div>
        }
        @if (state()?.doom) {
          <div class="relative flex justify-center items-center w-6 h-6">
            <img [ngSrc]="imagesService.getSimpleOverlay('doom')" fill />
            <span class="z-10 text-lg text-white font-teutonic">{{
              state()?.doom
            }}</span>
          </div>
        }
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
