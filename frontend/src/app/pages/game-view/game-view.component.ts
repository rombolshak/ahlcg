import {
  ChangeDetectionStrategy,
  Component,
  signal,
  WritableSignal,
} from '@angular/core';
import { CardInfo } from 'models/card-info.model';
import {
  cardA,
  cardA2,
  cardA3,
  cardA4,
  cardA5,
  cardE,
  cardS,
} from 'models/test/test-cards';
import { Card } from '../../models/card.model';
import { CardsHandComponent } from './components/cards-hand/cards-hand.component';
import { InvestigatorComponent } from './components/investigator/investigator.component';
import { AssetState } from '../../models/asset.state';
import { InvestigatorS } from '../../models/test/test-investigators';
import { ControlAreaComponent } from './components/control-area/control-area.component';

@Component({
  selector: 'ah-game-view',
  imports: [CardsHandComponent, InvestigatorComponent, ControlAreaComponent],
  template: `
    <ah-investigator
      class="col-start-1 row-start-1"
      [baseModel]="InvestigatorS"
      [assetState]="assetState"
    ></ah-investigator>
    <ah-control-area
      [assets]="assets"
      class="col-start-2"
      [states]="assetStates"
    ></ah-control-area>
    <button (click)="addCard()" class="bg-red-400 col-start-3">ADD CARD</button>
    <ah-cards-hand
      [cards]="cards()"
      (cardSelected)="removeCard($event.id)"
      class="col-start-2 row-start-3"
    ></ah-cards-hand>
  `,
  styles: `
    :host {
      display: grid;
      grid-template-columns: 17rem 1fr 10rem;
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
  protected assets = [
    cardA,
    cardA5,
    cardA2,
    cardA,
    cardA,
    cardA3,
    cardA,
    cardA4,
    cardA,
    cardA2,
    cardA,
    cardA,
    cardA4,
    cardA,
  ];
  protected assetStates = new Map<string, AssetState>([
    [cardA2.id, { damage: 1 }],
  ]);
  private index = 1;
  private availableCards: CardInfo[] = [cardA, cardE, cardS];
  cards: WritableSignal<Card[]> = signal([
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
          this.availableCards[
            Math.floor(Math.random() * this.availableCards.length)
          ],
      },
    ]);
  }

  removeCard(id: number) {
    this.cards.update((value) => value.filter((card) => card.id !== id));
  }

  protected readonly InvestigatorS = InvestigatorS;
}
