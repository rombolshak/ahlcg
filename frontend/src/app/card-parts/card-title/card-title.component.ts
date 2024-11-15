import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { CardBase } from '../../models/card-base.model';
import { NgClass } from '@angular/common';

@Component({
  selector: 'ah-card-title',
  standalone: true,
  imports: [NgClass],
  template: ` <div
    class="w-full font-conkordia
    group-data-[size=l]:pl-[81px] group-data-[size=l]:pr-[81px] group-data-[size=l]:text-2xl
    group-data-[size=m]:pl-[48px] group-data-[size=m]:pr-[40px] group-data-[size=m]:text-lg/[18px]
    group-data-[size=s]:pl-[30px] group-data-[size=s]:pr-[22px] group-data-[size=s]:text-[10px]/[10px]"
    [ngClass]="align() == 'center' ? 'text-center' : 'text-left'"
  >
    {{ card().title }}
  </div>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CardTitleComponent {
  card = input.required<CardBase>();
  align = input<'left' | 'center'>('center');
}
