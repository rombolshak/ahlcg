import {
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  input,
  output,
} from '@angular/core';
import {
  animate,
  sequence,
  state,
  style,
  transition,
  trigger,
} from '@angular/animations';
import { CardComponent } from 'components/cards/card/card.component';
import { Card } from 'models/card.model';
import { DisplayOptions } from 'models/display.options';
import { CardConstants } from '../../../../models/card.constants';

@Component({
  selector: 'ah-cards-hand',
  imports: [CardComponent],
  templateUrl: './cards-hand.component.html',
  styles: `
    :host {
      @apply flex justify-center;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [
    trigger('cardsHand', [transition(':enter', [])]),
    trigger('cardState', [
      state(
        'normal',
        style({
          width: 'var(--card-offset)',
        }),
      ),
      state(
        'focused',
        style({
          width: '160px',
          'z-index': 50,
          scale: '150%',
          transform: 'translateY(-8rem)',
        }),
      ),
      transition('normal <=> focused', [animate('0.2s ease-in-out')]),
      transition(':enter', [
        style({
          opacity: 0,
          width: 0,
          scale: 2.25,
          transform: 'translate(10rem, -10rem)',
        }),
        sequence([
          animate(
            '0.5s ease-out',
            style({
              opacity: 1,
              width: 'var(--card-offset)',
              transform: 'translate(-5vh, -10rem)',
            }),
          ),
          animate('0.5s 0.25s ease-in-out'),
        ]),
      ]),
      transition(':leave', [
        animate(
          '0.25s ease-in',
          style({
            opacity: 0,
            transform: 'translate(-10vh, -10rem)',
            width: 0,
          }),
        ),
      ]),
    ]),
  ],
})
export class CardsHandComponent {
  constructor(private element: ElementRef) {}

  cards = input.required<Card[]>();
  cardSelected = output<Card>();

  cardDisplayOptions: DisplayOptions = { cardSize: 's', textSize: 's' };
  focusedCardId?: number;
  cardOffset = computed(() => `${this.calcOffsetFrom(this.cards())}px`);
  cardWidth = CardConstants.cardWidths['s'];

  private calcOffsetFrom(cards: Card[]) {
    let container = this.element.nativeElement.getBoundingClientRect().width;
    if (container == 0) container = 600;
    if (cards.length < 2) return this.cardWidth;
    const value = Math.min(
      Math.max(
        (this.cardWidth * cards.length - container) / (cards.length - 1),
        this.cardWidth * 0.4,
      ),
      this.cardWidth * 0.8,
    );

    return this.cardWidth - value;
  }
}
