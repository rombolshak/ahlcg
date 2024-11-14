import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { CardBase } from '../../models/card-base.model';
import { NgClass } from '@angular/common';

@Component({
  selector: 'ah-card-title',
  standalone: true,
  imports: [NgClass],
  template: ` <div
    class="w-full px-20 font-conkordia text-2xl"
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
