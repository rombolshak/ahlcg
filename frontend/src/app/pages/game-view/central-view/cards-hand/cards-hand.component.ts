import {
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  input,
  output,
  inject,
} from '@angular/core';
import {
  animate,
  sequence,
  state,
  style,
  transition,
  trigger,
} from '@angular/animations';
import { CardComponent } from 'shared/ui/components/cards/card/card.component';
import { DisplayOptions } from 'shared/domain/display.options';
import { cardWidths } from 'shared/domain/card.constants';
import { PlayerCard } from 'shared/domain/entities/player-card.model';
import { PlayerCardId } from '../../../../shared/domain/entities/id.model';

@Component({
  selector: 'ah-cards-hand',
  imports: [CardComponent],
  templateUrl: './cards-hand.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'flex justify-center',
  },
  // eslint-disable-next-line @angular-eslint/component-max-inline-declarations
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
  private readonly element = inject(ElementRef);

  readonly cards = input.required<PlayerCard[]>();
  readonly cardSelected = output<PlayerCardId>();

  cardDisplayOptions: DisplayOptions = { cardSize: 's', textSize: 's' };
  focusedCardId: PlayerCardId | undefined;
  readonly cardOffset = computed(
    () => `${this.calcOffsetFrom(this.cards()).toString()}px`,
  );
  cardWidth = cardWidths.s;

  private calcOffsetFrom(cards: unknown[]) {
    let container = (
      this.element.nativeElement as HTMLElement
    ).getBoundingClientRect().width;
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
