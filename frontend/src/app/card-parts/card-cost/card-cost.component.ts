import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { WithCost } from '../../models/player-card.model';

@Component({
  selector: 'ah-card-cost',
  standalone: true,
  imports: [],
  template: `{{ card().cost }}`,
  styles: `:host {
  @apply text-outline w-9 text-center font-teutonic text-3xl text-white;
  }`,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CardCostComponent {
  card = input.required<WithCost>();
}
