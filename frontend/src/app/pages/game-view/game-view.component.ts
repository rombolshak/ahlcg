import {
  ChangeDetectionStrategy,
  Component,
  signal,
  WritableSignal,
} from '@angular/core';
import { CardInfo } from 'shared/domain/card-info.model';
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
import { CardsHandComponent } from './components/cards-hand/cards-hand.component';
import { InvestigatorComponent } from './components/investigator/investigator.component';
import { AssetState } from 'shared/domain/asset.state';
import { InvestigatorS } from 'shared/domain/test/test-investigators';
import { ControlAreaComponent } from './components/control-area/control-area.component';
import { PlayAreaComponent } from './components/play-area/play-area.component';
import { AssetCard } from 'shared/domain/player-card.model';

@Component({
  selector: 'ah-game-view',
  imports: [
    CardsHandComponent,
    InvestigatorComponent,
    ControlAreaComponent,
    PlayAreaComponent,
  ],
  templateUrl: './game-view.component.html',
  // eslint-disable-next-line @angular-eslint/component-max-inline-declarations
  styles: `
    :host {
      display: grid;
      grid-template-columns: 17rem 1fr 17rem;
      grid-template-rows: 10rem 1fr 7rem;
      grid-column-gap: 1rem;
      grid-row-gap: 1rem;
      height: 100vh;
      width: 100vw;
      padding: 2rem;
    }
  `,
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

  protected investigator = {
    ...InvestigatorS,
    ...this.assetState,
  };

  protected assets: AssetCard[] = [cardA, cardA5, cardA2, cardA, cardA];
  protected assetStates = new Map<string, AssetState>([
    [cardA2.id, { damage: 1 }],
    [cardA4.id, { resources: 3 }],
    [cardA5.id, { clues: 1 }],
    [cardA3.id, { doom: 1, resources: 6 }],
  ]);
  private index = 1;
  private readonly availableCards: CardInfo[] = [cardA, cardE, cardS];
  readonly cards: WritableSignal<Card[]> = signal([
    {
      id: this.index++,
      cardInfo: cardA,
    },
    {
      id: this.index++,
      cardInfo: cardS,
    },
  ]);

  addCard() {
    this.cards.update((value) => [
      ...value,
      {
        id: this.index++,
        cardInfo:
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          this.availableCards[
            Math.floor(Math.random() * this.availableCards.length)
          ]!,
      },
    ]);
  }

  removeCard(id: number) {
    this.cards.update((value) => value.filter((card) => card.id !== id));
  }

  protected readonly InvestigatorS = InvestigatorS;
}
