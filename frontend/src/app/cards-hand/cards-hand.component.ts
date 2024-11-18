import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  input,
  OnInit,
  QueryList,
  ViewChildren,
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

    [data-index='1'] {
      --data-index: 1;
    }

    [data-index='2'] {
      --data-index: 2;
    }

    [data-index='3'] {
      --data-index: 3;
    }

    [data-index='4'] {
      --data-index: 4;
    }

    [data-index='5'] {
      --data-index: 5;
    }

    [data-index='6'] {
      --data-index: 6;
    }

    [data-index='7'] {
      --data-index: 7;
    }

    [data-index='8'] {
      --data-index: 8;
    }

    [data-index='9'] {
      --data-index: 9;
    }

    [data-index='10'] {
      --data-index: 10;
    }

    [data-index='11'] {
      --data-index: 11;
    }

    [data-index='12'] {
      --data-index: 12;
    }

    [data-index='13'] {
      --data-index: 13;
    }

    [data-index='14'] {
      --data-index: 14;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CardsHandComponent implements OnInit {
  constructor(private element: ElementRef) {
    console.log(element.nativeElement.getBoundingClientRect());
  }

  cards = input.required<PlayerCardBase[]>();
  cardOffset: string | undefined;

  ngOnInit() {
    if (this.cards().length == 0) return;
    const cardWidth =
      PlayerCardComponent.cardWidths[this.cards()[0].displayOptions.cardSize];
    const value = Math.max(
      (cardWidth * this.cards().length -
        this.element.nativeElement.getBoundingClientRect().width) /
        (this.cards().length - 1),
      cardWidth * 0.2,
    );

    console.log(value);
    this.cardOffset = `${-value}px`;
  }

  @ViewChildren(PlayerCardComponent)
  private cardComponents!: QueryList<PlayerCardComponent>;
}
