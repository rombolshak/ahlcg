import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { CardInfo } from 'models/card-info.model';

@Component({
  selector: 'ah-card-subtitle',
  imports: [],
  template: `
    <div
      class="w-full font-[ArnoPro] text-center
    group-data-[size=l]:pl-[81px] group-data-[size=l]:pr-[81px] group-data-[size=l]:text-2xl
    group-data-[size=m]:pl-[48px] group-data-[size=m]:pr-[40px] group-data-[size=m]:text-lg/[18px]
    group-data-[size=s]:pl-[30px] group-data-[size=s]:pr-[22px] group-data-[size=s]:text-[10px]/[10px]
    group-data-[size=i]:text-xs/[12px]"
    >
      {{ card().subtitle }}
    </div>
  `,
  styles: ``,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CardSubtitleComponent {
  readonly card = input.required<CardInfo>();
}
