import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
} from '@angular/core';
import { AssetCard } from '../../../../models/player-card.model';
import { NgOptimizedImage } from '@angular/common';
import { ImagesUrlService } from '../../../../services/images-url.service';
import { CardOutlineDirective } from '../../../../directives/card-outline.directive';
import { AssetState } from '../../../../models/asset.state';

@Component({
  selector: 'ah-control-area',
  imports: [NgOptimizedImage, CardOutlineDirective],
  template: ` <div class="flex flex-wrap">
    @for (asset of assets(); track asset.id) {
      @let assetState = states().get(asset.id);

      <div
        class="basis-[7rem] mr-3 mb-3 rounded-lg bg-gray-950/70"
        ahCardOutline
        [cardClass]="asset.class"
      >
        <img
          [ngSrc]="imagesService.getMiniIllustration(asset.setInfo)"
          width="240"
          height="180"
        />

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
}
