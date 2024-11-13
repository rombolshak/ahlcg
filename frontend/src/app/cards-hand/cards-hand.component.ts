import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { PlayerCardBase } from '../models/player-card.model';
import { CardComponent } from '../cards/card/card.component';

@Component({
  selector: 'ah-cards-hand',
  standalone: true,
  imports: [
    CardComponent
  ],
  templateUrl: './cards-hand.component.html',
  styles: `:host {
  @apply flex flex-row;
  }`,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CardsHandComponent {
  cards = input.required<PlayerCardBase[]>();
}
