import { Component, signal, WritableSignal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { cardA, cardE, cardS } from './models/test/test-cards';
import { NgOptimizedImage } from '@angular/common';
import { CardsHandComponent } from './cards-hand/cards-hand.component';
import { Card } from './models/card.model';
import { CardInfo } from './models/card-info.model';

@Component({
  selector: 'ah-root',
  standalone: true,
  imports: [RouterOutlet, NgOptimizedImage, CardsHandComponent],
  template: `
    <img ngSrc="/assets/images/bg-min.jpg" fill priority class="-z-50" />
    <button (click)="addCard()" class="bg-red-400">ADD CARD</button>
    <ah-cards-hand
      [cards]="cards()"
      (cardSelected)="removeCard($event.id)"
      class="col-start-4 col-span-10 row-start-9"
    ></ah-cards-hand>
  `,
  styles: `
    :host {
      @apply grid grid-cols-16 grid-rows-9 h-screen w-screen;
    }
  `,
})
export class AppComponent {
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
