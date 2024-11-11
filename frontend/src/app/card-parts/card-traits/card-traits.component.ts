import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { PlayerCardBase } from '../../models/player-card.model';

@Component({
  selector: 'ah-card-traits',
  standalone: true,
  imports: [],
  template: `
    @for (trait of card().traits; track $index) {
      <span>{{ trait.displayValue }}. </span>
    }
  `,
  styles: `:host {
  @apply block mb-1 text-center font-arno-bold italic text-base;
  }`,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CardTraitsComponent {
  card = input.required<PlayerCardBase>();
}
