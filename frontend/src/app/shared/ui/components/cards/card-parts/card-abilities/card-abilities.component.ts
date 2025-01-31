import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { WithAhSymbolsPipe } from 'shared/ui/pipes/with-ah-symbols.pipe';
import { PlayerCardBase } from 'shared/domain/player-card.model';
import { DisplayOptions } from 'shared/domain/display.options';

@Component({
  selector: 'ah-card-abilities',
  imports: [WithAhSymbolsPipe],
  template: `
    @for (ability of card().abilities; track $index) {
      <p
        class="group-data-[size=l]:mb-1 group-data-[size=l]:data-[text-size=m]:text-[18px]/4 group-data-[size=l]:data-[text-size=s]:text-[16px]/4
      group-data-[size=m]:mb-0.5 group-data-[size=m]:data-[text-size=m]:text-[12px]/3 group-data-[size=m]:data-[text-size=s]:text-[10px]/[10px]
      group-data-[size=s]:mb-px group-data-[size=s]:data-[text-size=m]:text-[8px]/[8px] group-data-[size=s]:data-[text-size=s]:text-[7px]/[7px]
      group-data-[size=i]:text-[12px]/3 group-data-[size=i]:mb-0.5 whitespace-pre-wrap font-[ArnoPro]"
        [attr.data-text-size]="displayOptions().textSize"
        [innerHtml]="ability | withAhSymbols"
      ></p>
    }
  `,
  styles: ``,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CardAbilitiesComponent {
  readonly card = input.required<PlayerCardBase>();
  readonly displayOptions = input.required<DisplayOptions>();
}
