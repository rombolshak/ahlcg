import {
  ChangeDetectionStrategy,
  Component,
  signal,
  WritableSignal,
} from '@angular/core';
import { CardInfo } from '../../models/card-info.model';
import { cardA, cardE, cardS } from '../../models/test/test-cards';
import { Card } from '../../models/card.model';
import { CardsHandComponent } from './components/cards-hand/cards-hand.component';

@Component({
  selector: 'ah-game-view',
  imports: [CardsHandComponent],
  template: `
    <button (click)="addCard()" class="bg-red-400">ADD CARD</button>
    <ah-cards-hand
      [cards]="cards()"
      (cardSelected)="removeCard($event.id)"
      class="col-start-3 col-span-12 row-start-9"
    ></ah-cards-hand>
  `,
  styles: ``,
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
