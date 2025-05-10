import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
} from '@angular/core';
import { CardsHandComponent } from './cards-hand/cards-hand.component';
import { ControlAreaComponent } from './control-area/control-area.component';
import { PlayAreaComponent } from './play-area/play-area.component';
import {
  AssetsStore,
  GameStateStore,
  InvestigatorsStore,
} from '../store/store';
import { PlayerCardStore } from '../store/player-card.store';

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
  private readonly state = inject(GameStateStore);
  private readonly investigators = inject(InvestigatorsStore);
  private readonly assetStore = inject(AssetsStore);
  private readonly playerCardStore = inject(PlayerCardStore);

  private readonly currentInvestigatorModel = computed(() => {
    if (!this.state.value()) {
      return null;
    }

    const investigator =
      this.investigators.entityMap()[
        this.state.value()?.currentInvestigator ?? -1
      ];
    if (!investigator) {
      throw new Error('No investigator found in store');
    }
    return investigator;
  });

  readonly assets = computed(() => {
    return (
      this.currentInvestigatorModel()
        ?.controlledAssets.map((a) => this.assetStore.entityMap()[a])
        .filter((a) => a !== undefined) ?? []
    );
  });

  readonly cards = computed(() => {
    return (
      this.currentInvestigatorModel()
        ?.hand.map((card) => this.playerCardStore.entityMap()[card])
        .filter((card) => card !== undefined) ?? []
    );
  });
}
