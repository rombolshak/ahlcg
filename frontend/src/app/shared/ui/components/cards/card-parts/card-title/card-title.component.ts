import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { CardInfo } from 'shared/domain/entities/details/card-info.model';
import { NgClass } from '@angular/common';
import { TranslocoPipe } from '@jsverse/transloco';

@Component({
  selector: 'ah-card-title',
  imports: [NgClass, TranslocoPipe],
  template: `
    <div
      class="w-full font-[Conkordia]
    group-data-[size=l]:pl-[81px] group-data-[size=l]:pr-[81px] group-data-[size=l]:text-2xl
    group-data-[size=m]:pl-[48px] group-data-[size=m]:pr-[40px] group-data-[size=m]:text-lg/[18px]
    group-data-[size=s]:pl-[30px] group-data-[size=s]:pr-[22px] group-data-[size=s]:text-[10px]/[10px]
    group-data-[size=i]:text-lg/[18px]"
      [ngClass]="align() === 'center' ? 'text-center' : 'text-left'"
    >
      {{ card().title | transloco }}
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CardTitleComponent {
  readonly card = input.required<CardInfo>();
  readonly align = input<'left' | 'center'>('center');
}
