import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { AssetCard } from '../../../../../shared/domain/entities/player-card.model';
import { ControlledAssetComponent } from '../controlled-asset/controlled-asset.component';

@Component({
  selector: 'ah-passive-assets-list',
  imports: [ControlledAssetComponent],
  templateUrl: './passive-assets-list.component.html',
  styles: ``,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PassiveAssetsListComponent {
  readonly assets = input.required<AssetCard[]>();
}
