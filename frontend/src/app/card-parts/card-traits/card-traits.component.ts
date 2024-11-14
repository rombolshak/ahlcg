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
      [attr.text-size]="card().displayOptions.textSize"
      class="text-center font-arno-bold italic"
      [class.text-sm]="card().displayOptions.textSize == 's'"
      [class.mb-0.5]="card().displayOptions.textSize == 's'"
      [class.mb-1]="card().displayOptions.textSize == 'm'"
    >
      @for (trait of card().traits; track $index) {
        <span [class.text-sm]="card().displayOptions.textSize == 's'"
          >{{ trait.displayValue }}.
        </span>
      }
    </p>
  `,
  changeDetection: ChangeDetectionStrategy.Default,
})
export class CardTraitsComponent {
  card = input.required<PlayerCardBase>();
}
