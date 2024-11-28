import {
  ChangeDetectionStrategy,
  Component,
  signal,
  WritableSignal,
} from '@angular/core';
import { CardInfo } from 'models/card-info.model';
import { cardA, cardE, cardS } from 'models/test/test-cards';
import { Card } from '../../models/card.model';
import { CardsHandComponent } from './components/cards-hand/cards-hand.component';
import { InvestigatorComponent } from './components/investigator/investigator.component';

@Component({
  selector: 'ah-game-view',
  imports: [CardsHandComponent, InvestigatorComponent],
  template: `
    <ah-investigator class="col-start-1 row-start-1"></ah-investigator>
    <button (click)="addCard()" class="bg-red-400 col-start-3">ADD CARD</button>
    <ah-cards-hand
      [cards]="cards()"
      (cardSelected)="removeCard($event.id)"
      class="col-start-2 row-start-4"
    ></ah-cards-hand>
  `,
  styles: `
    :host {
      display: grid;
      grid-template-columns: 17rem 1fr 10rem;
      grid-template-rows: 7rem 1fr repeat(2, 7rem);
      grid-column-gap: 0;
      grid-row-gap: 0;
      height: 100vh;
      width: 100vw;
      padding: 2rem;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GameViewComponent {
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
}
