import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
} from '@angular/core';
import { AssetCard } from 'models/player-card.model';
import { CreateOverlay, ImagesUrlService } from 'services/images-url.service';
import { AssetState } from 'models/asset.state';
import { ControlledAssetComponent } from './controlled-asset/controlled-asset.component';
import { CardOutlineDirective } from 'directives/card-outline.directive';

@Component({
  selector: 'ah-control-area',
  imports: [ControlledAssetComponent, CardOutlineDirective],
  template: ` <div class="flex flex-wrap">
    @for (asset of assets(); track asset.id) {
      @let assetState = states().get(asset.id);
      <ah-controlled-asset
        [asset]="asset"
        [state]="assetState"
        class="basis-[6rem] aspect-[4/3] mr-3 mb-3 rounded-lg"
        ahCardOutline
        [cardClass]="asset.class"
      ></ah-controlled-asset>
    }
  </div>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ControlAreaComponent {
  assets = input.required<AssetCard[]>();
  states = input.required<Map<string, AssetState>>();
  imagesService = inject(ImagesUrlService);
  protected readonly CreateOverlay = CreateOverlay;
}
