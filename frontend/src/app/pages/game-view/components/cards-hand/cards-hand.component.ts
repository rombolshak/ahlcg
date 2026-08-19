import { ChangeDetectionStrategy, Component, computed, ElementRef, inject, input, output } from '@angular/core';
import { cardWidths } from '@domain/card.constants';
import { DisplayOptions } from '@domain/display.options';
import { PlayerCardId } from '@domain/entities/id.model';
import { PlayerCard } from '@domain/entities/player-card.model';
import { CardComponent } from '@features/card/card.component';

@Component({
  selector: 'ah-cards-hand',
  imports: [CardComponent],
  templateUrl: './cards-hand.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'flex justify-center bg-gradient-to-t from-base-200 via-base-200/80 via-[65%] to-base-200/0',
  },
})
export class CardsHandComponent {
  private readonly element = inject(ElementRef);

  readonly cards = input.required<PlayerCard[]>();
  readonly cardSelected = output<PlayerCardId>();

  cardDisplayOptions: DisplayOptions = { cardSize: 's', textSize: 's' };
  focusedCardId: PlayerCardId | undefined;
  readonly cardOffset = computed(() => `${this.calcOffsetFrom(this.cards()).toString()}px`);
  cardWidth = cardWidths.s;

  private calcOffsetFrom(cards: unknown[]) {
    let container = (this.element.nativeElement as HTMLElement).getBoundingClientRect().width;
    if (container == 0) container = 600;
    if (cards.length < 2) return this.cardWidth;
    const value = Math.min(Math.max((this.cardWidth * cards.length - container) / (cards.length - 1), this.cardWidth * 0.4), this.cardWidth * 0.8);

    return this.cardWidth - value;
  }
}
