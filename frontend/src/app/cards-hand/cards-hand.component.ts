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
import { CardComponent } from '../cards/card/card.component';
import { PlayerCardComponent } from '../card-parts/card-player-base/player-card.component';
import { Card } from '../models/card.model';
import { DisplayOptions } from '../models/display.options';
import {
  animate,
  sequence,
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
      state(
        'normal',
        style({
          'margin-right': 'var(--card-offset)',
        }),
      ),
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
      transition(':enter', [
        style({
          opacity: 0,
          scale: 2.25,
          transform: 'translate(10rem, -10rem)',
        }),
        sequence([
          animate(
            '0.5s ease-out',
            style({
              opacity: 1,
              transform: 'translate(-5vh, -10rem)',
            }),
          ),
          animate('0.5s 0.25s ease-in-out'),
        ]),
      ]),
      transition(':leave', [
        animate(
          '0.25s ease-in',
          style({ opacity: 0, transform: 'translate(0vh, -10rem)' }),
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
  cardOffset = computed(() => `-${this.calcOffsetFrom(this.cards())}px`);
  cardWidth = PlayerCardComponent.cardWidths['s'];

  private calcOffsetFrom(cards: Card[]) {
    if (cards.length == 0) return;
    const value = Math.min(
      Math.max(
        (this.cardWidth * cards.length -
          this.element.nativeElement.getBoundingClientRect().width) /
          (cards.length - 1),
        this.cardWidth * 0.4,
      ),
      this.cardWidth * 0.8,
    );

    return value;
  }
}
