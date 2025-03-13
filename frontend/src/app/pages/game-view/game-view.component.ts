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
import { Card } from 'shared/domain/card.model';
import { AssetState } from 'shared/domain/asset.state';
import { InvestigatorS } from 'shared/domain/test/test-investigators';
import { AssetCard } from 'shared/domain/player-card.model';
import { testEnemy } from '../../shared/domain/test/test-enemies';
import { testAgenda } from '../../shared/domain/test/test-agenda';
import { testAct } from '../../shared/domain/test/test-act';
import { InvestigatorWithState } from 'shared/domain/investigator.model';
import { LeftPanelComponent } from './left-panel/left-panel.component';
import { CentralViewComponent } from './central-view/central-view.component';
import { RightPanelComponent } from './right-panel/right-panel.component';

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
  protected assetState: AssetState = {
    damage: 2,
    horror: 1,
    resources: 6,
    clues: 3,
    doom: 0,
  };

  enemy = testEnemy;
  protected investigator: InvestigatorWithState = {
    ...InvestigatorS,
    ...this.assetState,
    threatArea: [
      {
        ...this.enemy,
        damage: 1,
      },
      {
        ...this.enemy,
        damage: 3,
      },
    ],
  };

  protected assets: AssetCard[] = [cardA, cardA5, cardA2, cardA, cardA];
  protected assetStates = new Map<string, AssetState>([
    [cardA2.id, { damage: 1 }],
    [cardA4.id, { resources: 3 }],
    [cardA5.id, { clues: 1 }],
    [cardA3.id, { doom: 1, resources: 6 }],
  ]);
  readonly cards: WritableSignal<Card[]> = signal([
    {
      id: 1,
      cardInfo: cardA,
    },
    {
      id: 2,
      cardInfo: cardS,
    },
    {
      id: 3,
      cardInfo: cardE,
    },
  ]);

  protected readonly InvestigatorS = InvestigatorS;
  protected readonly testAgenda = testAgenda;
  protected readonly testAct = testAct;
}
