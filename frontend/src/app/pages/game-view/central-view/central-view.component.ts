import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { CardsHandComponent } from './cards-hand/cards-hand.component';
import { ControlAreaComponent } from './control-area/control-area.component';
import { PlayAreaComponent } from './play-area/play-area.component';
import { AssetCard } from 'shared/domain/player-card.model';
import { AssetState } from 'shared/domain/asset.state';
import { Card } from 'shared/domain/card.model';

@Component({
  selector: 'ah-central-view',
  imports: [CardsHandComponent, ControlAreaComponent, PlayAreaComponent],
  templateUrl: './central-view.component.html',
  host: {
    class: 'flex flex-col gap-4',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CentralViewComponent {
  readonly assets = input.required<AssetCard[]>();
  readonly assetStates = input.required<Map<string, AssetState>>();
  readonly cards = input.required<Card[]>();
}
