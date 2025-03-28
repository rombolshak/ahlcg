import {
  ChangeDetectionStrategy,
  Component,
  signal,
  WritableSignal,
} from '@angular/core';
import {
  cardA,
  cardA2,
  cardA3,
  cardA4,
  cardA5,
  cardE,
  cardS,
} from 'shared/domain/test/test-cards';
import { InvestigatorS } from 'shared/domain/test/test-investigators';
import { testEnemy } from '../../shared/domain/test/test-enemies';
import { testAgenda } from '../../shared/domain/test/test-agenda';
import { testAct } from '../../shared/domain/test/test-act';
import { LeftPanelComponent } from './left-panel/left-panel.component';
import { CentralViewComponent } from './central-view/central-view.component';
import { RightPanelComponent } from './right-panel/right-panel.component';
import { Investigator } from 'shared/domain/investigator.model';
import { AssetCard, PlayerCard } from '../../shared/domain/player-card.model';

@Component({
  selector: 'ah-game-view',
  imports: [LeftPanelComponent, CentralViewComponent, RightPanelComponent],
  templateUrl: './game-view.component.html',
  host: {
    class: 'flex gap-4 p-8 h-screen w-screen',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GameViewComponent {
  enemy = testEnemy;
  protected investigator: Investigator = {
    ...InvestigatorS,
    threatArea: [
      {
        ...this.enemy,
      },
      {
        ...this.enemy,
      },
    ],
  };

  protected assets: AssetCard[] = [
    cardA,
    cardA5,
    cardA2,
    cardA3,
    cardA4,
    cardA,
    cardA,
  ];
  readonly cards: WritableSignal<PlayerCard[]> = signal([cardA, cardS, cardE]);

  protected readonly InvestigatorS = InvestigatorS;
  protected readonly testAgenda = testAgenda;
  protected readonly testAct = testAct;
}
