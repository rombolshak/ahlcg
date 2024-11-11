import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { WithAhSymbolsPipe } from '../../pipes/with-ah-symbols.pipe';
import { PlayerCardBase } from '../../models/player-card.model';

@Component({
  selector: 'ah-card-abilities',
  standalone: true,
  imports: [
    WithAhSymbolsPipe
  ],
  template: `
    @for (ability of card().abilities; track $index) {
      <p class="mb-1 text-m" [innerHtml]="ability | withAhSymbols"></p>
    }`,
  styles: ``,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CardAbilitiesComponent {
  card = input.required<PlayerCardBase>();
}
