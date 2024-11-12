import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { CardBase } from '../../models/card-base.model';

@Component({
  selector: 'ah-card-title',
  standalone: true,
  imports: [],
  template: `{{ card().title }}`,
  styles: `:host {
  @apply w-full px-20 font-conkordia text-2xl;
  }`,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CardTitleComponent {
  card = input.required<CardBase>();
}
