import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  input,
  OnInit,
} from '@angular/core';
import { PlayerCardBase } from '../models/player-card.model';
import { CardComponent } from '../cards/card/card.component';
import { PlayerCardComponent } from '../card-parts/card-player-base/player-card.component';

@Component({
  selector: 'ah-cards-hand',
  standalone: true,
  imports: [CardComponent],
  templateUrl: './cards-hand.component.html',
  styles: `
    :host {
      @apply flex justify-center;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CardsHandComponent implements OnInit {
  constructor(private element: ElementRef) {}

  cards = input.required<PlayerCardBase[]>();
  cardOffset: string | undefined;

  ngOnInit() {
    if (this.cards().length == 0) return;
    const cardWidth =
      PlayerCardComponent.cardWidths[this.cards()[0].displayOptions.cardSize];
    const value = Math.min(
      Math.max(
        (cardWidth * this.cards().length -
          this.element.nativeElement.getBoundingClientRect().width) /
          (this.cards().length - 1),
        cardWidth * 0.2,
      ),
      cardWidth * 0.8,
    );

    this.cardOffset = `${-value}px`;
  }
}
