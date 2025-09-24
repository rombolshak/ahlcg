import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
} from '@angular/core';
import { AssetCard } from 'shared/domain/entities/player-card.model';
import { ImagesUrlService } from 'shared/services/images-url.service';
import { CardOutlineDirective } from 'shared/ui/directives/card-outline.directive';
import { ControlledAssetComponent } from './controlled-asset/controlled-asset.component';

@Component({
  selector: 'ah-control-area',
  imports: [ControlledAssetComponent, CardOutlineDirective],
  template: `
    @for (asset of assets(); track asset.id) {
      <ah-controlled-asset
        class="h-[4.5rem] w-[6rem] rounded-lg"
        ahCardOutline
        [asset]="asset"
        [faction]="asset.faction"
      />
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'flex flex-wrap gap-3',
  },
})
export class ControlAreaComponent {
  readonly assets = input.required<AssetCard[]>();
  imagesService = inject(ImagesUrlService);
}
