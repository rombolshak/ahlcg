import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { WithAhSymbolsPipe } from '../../pipes/with-ah-symbols.pipe';
import { PlayerCardBase } from '../../models/player-card.model';
import { DisplayOptions } from '../../models/display.options';

@Component({
    selector: 'ah-card-abilities',
    imports: [WithAhSymbolsPipe],
    template: ` @for (ability of card().abilities; track $index) {
    <p
      [attr.data-text-size]="displayOptions().textSize"
      class="group-data-[size=l]:mb-1 group-data-[size=l]:data-[text-size=m]:text-[18px]/4 group-data-[size=l]:data-[text-size=s]:text-[16px]/4
      group-data-[size=m]:mb-0.5 group-data-[size=m]:data-[text-size=m]:text-[12px]/3 group-data-[size=m]:data-[text-size=s]:text-[10px]/[10px]
      group-data-[size=s]:mb-px group-data-[size=s]:data-[text-size=m]:text-[8px]/[8px] group-data-[size=s]:data-[text-size=s]:text-[7px]/[7px]
      whitespace-pre-wrap font-arno"
      [innerHtml]="ability | withAhSymbols"
    ></p>
  }`,
    styles: ``,
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class CardAbilitiesComponent {
  card = input.required<PlayerCardBase>();
  displayOptions = input.required<DisplayOptions>();
}
