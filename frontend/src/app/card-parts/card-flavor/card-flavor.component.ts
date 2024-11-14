import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { CardBase } from '../../models/card-base.model';

@Component({
  selector: 'ah-card-flavor',
  standalone: true,
  imports: [],
  template: `<p
    class="w-full whitespace-pre-wrap px-12 text-center font-arno text-sm italic leading-3"
  >
    {{ card().flavor }}
  </p>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CardFlavorComponent {
  card = input.required<CardBase>();
}
