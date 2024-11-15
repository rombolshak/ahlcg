import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { CardBase } from '../../models/card-base.model';

@Component({
  selector: 'ah-card-flavor',
  standalone: true,
  imports: [],
  template: `<p
    class="absolute group-data-[size=l]:bottom-12 group-data-[size=m]:bottom-8
      group-data-[size=s]:bottom-5 group-data-[size=l]:px-12 group-data-[size=m]:px-8 group-data-[size=s]:px-4
      w-full whitespace-pre-wrap text-center font-arno italic
      group-data-[size=l]:text-[14px]/[14px] group-data-[size=m]:text-[10px]/[10px] group-data-[size=s]:text-[6px]/[6px]"
  >
    {{ card().flavor }}
  </p>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CardFlavorComponent {
  card = input.required<CardBase>();
}
