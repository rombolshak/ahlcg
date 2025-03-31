import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
} from '@angular/core';
import { AssetCard } from 'shared/domain/player-card.model';
import {
  CreateOverlay,
  ImagesUrlService,
} from 'shared/services/images-url.service';
import { ControlledAssetComponent } from './controlled-asset/controlled-asset.component';
import { CardOutlineDirective } from 'shared/ui/directives/card-outline.directive';

@Component({
  selector: 'ah-control-area',
  imports: [ControlledAssetComponent, CardOutlineDirective],
  template: `
    @for (asset of assets(); track asset.id) {
      <ah-controlled-asset
        class="w-[6rem] h-[4.5rem] mr-3 mb-3 rounded-lg"
        ahCardOutline
        [asset]="asset"
        [cardClass]="asset.class"
      />
    }
  `,
  host: {
    class: 'flex flex-wrap',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ControlAreaComponent {
  readonly assets = input.required<AssetCard[]>();
  imagesService = inject(ImagesUrlService);
  protected readonly CreateOverlay = CreateOverlay;
}
