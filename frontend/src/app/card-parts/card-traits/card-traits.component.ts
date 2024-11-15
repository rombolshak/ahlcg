import {
  ChangeDetectionStrategy,
  Component,
  HostBinding,
  input,
} from '@angular/core';
import { PlayerCardBase } from '../../models/player-card.model';

@Component({
  selector: 'ah-card-traits',
  standalone: true,
  imports: [],
  template: `
    <p
      [attr.data-text-size]="card().displayOptions.textSize"
      class="text-center font-arno-bold italic
      group-data-[size=l]:mb-1 group-data-[size=l]:data-[text-size=m]:text-[16px]/4 group-data-[size=l]:data-[text-size=s]:text-[14px]/4
      group-data-[size=m]:mb-0.5 group-data-[size=m]:data-[text-size=m]:text-[10px]/[10px] group-data-[size=m]:data-[text-size=s]:text-[8px]/[8px]
      group-data-[size=s]:mb-px group-data-[size=s]:data-[text-size=m]:text-[6px]/[6px] group-data-[size=s]:data-[text-size=s]:text-[5px]/[5px]"
    >
      @for (trait of card().traits; track $index) {
        <span>{{ trait.displayValue }}. </span>
      }
    </p>
  `,
  changeDetection: ChangeDetectionStrategy.Default,
})
export class CardTraitsComponent {
  card = input.required<PlayerCardBase>();
}
