import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
} from '@angular/core';
import { AssetCard } from '../../../../models/player-card.model';
import { NgOptimizedImage } from '@angular/common';
import {
  CreateOverlay,
  ImagesUrlService,
} from '../../../../services/images-url.service';
import { CardOutlineDirective } from '../../../../directives/card-outline.directive';
import { AssetState } from '../../../../models/asset.state';

@Component({
  selector: 'ah-control-area',
  imports: [NgOptimizedImage, CardOutlineDirective],
  template: ` <div class="flex flex-wrap">
    @for (asset of assets(); track asset.id) {
      @let assetState = states().get(asset.id);

      <div
        class="basis-[7rem] aspect-[4/3] mr-3 mb-3 rounded-lg flex flex-col justify-between relative"
        ahCardOutline
        [cardClass]="asset.class"
      >
        <img
          [ngSrc]="imagesService.getMiniIllustration(asset.setInfo)"
          fill
          class="-z-10 rounded"
        />

        <div class="bg-gray-950/70">
          @if (assetState) {
            @if (asset.sanity) {
              <div
                class="h-2 flex flex-row-reverse *:flex-1 mb-1 mt-1 rounded-md"
              >
                @for (_ of [].constructor(asset.sanity); track $index) {
                  @if ($index < (assetState.horror ?? -1)) {
                    <div class="border-sky-700 border-4 ml-1 last:ml-0"></div>
                  } @else {
                    <div class="border-sky-300 border-4 ml-1 last:ml-0"></div>
                  }
                }
              </div>
            }
            @if (asset.health) {
              <div
                class="h-2 flex flex-row-reverse *:flex-1 mb-1 mt-1 rounded-md"
              >
                @for (_ of [].constructor(asset.health); track $index) {
                  @if ($index < (assetState.damage ?? -1)) {
                    <div class="border-red-700 border-4 ml-1 last:ml-0"></div>
                  } @else {
                    <div class="border-red-300 border-4 ml-1 last:ml-0"></div>
                  }
                }
              </div>
            }
          }
        </div>
        <div class="bg-gray-950/50 flex justify-center items-center">
          @if (asset.slot) {
            <img
              [ngSrc]="
                imagesService.getOverlay(CreateOverlay.cardSlot(asset.slot))
              "
              width="24"
              height="24"
            />
          }

          @if (asset.additionalSlot) {
            <img
              [ngSrc]="
                imagesService.getOverlay(
                  CreateOverlay.cardSlot(asset.additionalSlot)
                )
              "
              width="24"
              height="24"
            />
          }

          @if (assetState?.resources) {
            <div class="relative flex justify-center items-center w-6 h-6">
              <img [ngSrc]="imagesService.getSimpleOverlay('resource')" fill />
              <span class="z-10 text-lg text-white font-teutonic">{{
                assetState?.resources
              }}</span>
            </div>
          }
          @if (assetState?.clues) {
            <div class="relative flex justify-center items-center w-6 h-6">
              <img [ngSrc]="imagesService.getSimpleOverlay('clue')" fill />
              <span class="z-10 text-lg text-white font-teutonic">{{
                assetState?.clues
              }}</span>
            </div>
          }
          @if (assetState?.doom) {
            <div class="relative flex justify-center items-center w-6 h-6">
              <img [ngSrc]="imagesService.getSimpleOverlay('doom')" fill />
              <span class="z-10 text-lg text-white font-teutonic">{{
                assetState?.doom
              }}</span>
            </div>
          }
        </div>
      </div>
    }
  </div>`,
  styles: `
    :host {
      img {
      }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ControlAreaComponent {
  assets = input.required<AssetCard[]>();
  states = input.required<Map<string, AssetState>>();
  imagesService = inject(ImagesUrlService);
  protected readonly CreateOverlay = CreateOverlay;
}
