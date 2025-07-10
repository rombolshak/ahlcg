import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
} from '@angular/core';
import { CardsHandComponent } from './cards-hand/cards-hand.component';
import { ControlAreaComponent } from './control-area/control-area.component';
import { PlayAreaComponent } from './play-area/play-area.component';
import { GameStateStore } from '../store/game-state.store';

@Component({
  selector: 'ah-central-view',
  imports: [CardsHandComponent, ControlAreaComponent, PlayAreaComponent],
  templateUrl: './central-view.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'flex flex-col gap-4',
  },
})
export class CentralViewComponent {
  private readonly state = inject(GameStateStore);

  readonly assets = computed(() => {
    return (
      this.state
        .currentInvestigator()
        ?.controlledAssets.map((a) => this.state.getAsset(a)) ?? []
    );
  });

  readonly cards = computed(() => {
    return (
      this.state
        .currentInvestigator()
        ?.hand.map((card) => this.state.getPlayerCard(card)) ?? []
    );
  });
}
