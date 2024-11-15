import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { WithCost } from '../../models/player-card.model';

@Component({
  selector: 'ah-card-cost',
  standalone: true,
  imports: [],
  template: `<span
    class="absolute
    group-data-[size=l]:left-[21px] group-data-[size=l]:top-3 group-data-[size=l]:w-9 group-data-[size=l]:text-3xl
    group-data-[size=m]:left-[14px] group-data-[size=m]:top-1 group-data-[size=m]:w-6 group-data-[size=m]:text-2xl
    group-data-[size=s]:left-[7px] group-data-[size=s]:top-0.5 group-data-[size=s]:w-3 group-data-[size=s]:text-xl
    text-center font-teutonic text-white text-outline "
    >{{ card().cost }}</span
  >`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CardCostComponent {
  card = input.required<WithCost>();
}
