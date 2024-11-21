import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  ElementRef,
  input,
  OnInit,
  output,
} from '@angular/core';
import { PlayerCardBase } from '../models/player-card.model';
import { CardComponent } from '../cards/card/card.component';
import { PlayerCardComponent } from '../card-parts/card-player-base/player-card.component';
import { Card } from '../models/card.model';
import { DisplayOptions } from '../models/display.options';
import {
  animate,
  state,
  style,
  transition,
  trigger,
} from '@angular/animations';

@Component({
  selector: 'ah-cards-hand',
  standalone: true,
  imports: [CardComponent, PlayerCardComponent],
  templateUrl: './cards-hand.component.html',
  styles: `
    :host {
      @apply flex justify-center;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [
    trigger('cardState', [
      state('normal', style({})),
      state(
        'focused',
        style({
          'margin-right': 0,
          'z-index': 50,
          scale: '150%',
          transform: 'translateY(-8rem)',
        }),
      ),
      transition('normal <=> focused', [animate('0.2s ease-in-out')]),
    ]),
  ],
})
export class CardsHandComponent {
  constructor(private element: ElementRef) {}

  cards = input.required<Card[]>();
  cardSelected = output<Card>();

  cardDisplayOptions: DisplayOptions = { cardSize: 's', textSize: 's' };
  focusedCardId?: number;
  cardOffset = computed(() => this.calcOffsetFrom(this.cards()));

  private calcOffsetFrom(cards: Card[]) {
    if (cards.length == 0) return;
    const cardWidth = PlayerCardComponent.cardWidths['s'];
    const value = Math.min(
      Math.max(
        (cardWidth * cards.length -
          this.element.nativeElement.getBoundingClientRect().width) /
          (cards.length - 1),
        cardWidth * 0.2,
      ),
      cardWidth * 0.8,
    );

    return `${-value}px`;
  }
}
