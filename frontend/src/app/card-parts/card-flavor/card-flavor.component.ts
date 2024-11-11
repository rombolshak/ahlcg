import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { CardBase } from '../../models/card-base.model';

@Component({
  selector: 'ah-card-flavor',
  standalone: true,
  imports: [],
  template: `{{ card().flavor }}`,
  styles: `:host {
  @apply w-full px-12 text-center font-arno italic text-sm leading-3 whitespace-pre-wrap;
  }`,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CardFlavorComponent {
  card = input.required<CardBase>();
}
