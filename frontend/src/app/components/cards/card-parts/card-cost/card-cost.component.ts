import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { WithCost } from 'models/player-card.model';

@Component({
  selector: 'ah-card-cost',
  imports: [],
  template: `
    <span
      class="absolute
    group-data-[size=l]:left-[21px] group-data-[size=l]:top-3 group-data-[size=l]:w-9 group-data-[size=l]:text-3xl
    group-data-[size=m]:left-[14px] group-data-[size=m]:top-1 group-data-[size=m]:w-6 group-data-[size=m]:text-2xl
    group-data-[size=s]:left-[8px] group-data-[size=s]:top-0.5 group-data-[size=s]:w-4 group-data-[size=s]:text-sm
    text-center font-[Teutonic] text-white text-outline "
    >
      {{ card().cost }}
    </span>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CardCostComponent {
  readonly card = input.required<WithCost>();
}
