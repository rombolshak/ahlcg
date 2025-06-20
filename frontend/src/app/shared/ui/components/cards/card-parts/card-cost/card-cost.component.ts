import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { TextWithOverlayComponent } from '../../../text-with-overlay/text-with-overlay.component';

@Component({
  selector: 'ah-card-cost',
  imports: [TextWithOverlayComponent],
  template: `
    <ah-text-with-overlay [text]="card().cost" />
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class:
      'absolute\n    group-data-[size=l]:left-[21px] group-data-[size=l]:top-3 group-data-[size=l]:w-9 group-data-[size=l]:text-3xl\n    group-data-[size=m]:left-[14px] group-data-[size=m]:top-1 group-data-[size=m]:w-6 group-data-[size=m]:text-2xl\n    group-data-[size=s]:left-[8px] group-data-[size=s]:top-0.5 group-data-[size=s]:w-4 group-data-[size=s]:text-sm\n    text-center font-[Teutonic]',
  },
})
export class CardCostComponent {
  readonly card = input.required<{ cost: number }>();
}
