import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { AssetCard } from 'shared/domain/entities/player-card.model';
import { ControlledAssetComponent } from '../controlled-asset/controlled-asset.component';

@Component({
  selector: 'ah-assets-list',
  imports: [ControlledAssetComponent],
  templateUrl: './assets-list.component.html',
  styles: ``,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AssetsListComponent {
  readonly activeAssets = input.required<AssetCard[]>();
  readonly passiveAssets = input.required<AssetCard[]>();
}
