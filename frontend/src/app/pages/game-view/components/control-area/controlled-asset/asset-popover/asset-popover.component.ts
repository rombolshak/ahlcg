import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { PlayerCardBase } from 'models/player-card.model';
import { WithAhSymbolsPipe } from 'pipes/with-ah-symbols.pipe';
import { CardOutlineDirective } from 'directives/card-outline.directive';
import { CardBackgroundDirective } from 'directives/card-background.directive';

@Component({
  selector: 'ah-asset-popover',
  imports: [WithAhSymbolsPipe, CardOutlineDirective, CardBackgroundDirective],
  template: ` <div
    ahCardOutline
    ahCardBackground
    [cardClass]="asset().class"
    class="w-full px-2 py-1 rounded whitespace-pre-wrap font-[ArnoPro] text-base/4 "
  >
    <p class="font-[Conkordia] text-lg/5 text-center mb-0">
      {{ asset().title }}
    </p>
    <p class="font-[ArnoPro] text-sm text-center mb-1">
      {{ asset().subtitle }}
    </p>
    <p class="font-[ArnoProBold] italic text-sm text-center mb-1">
      @for (trait of asset().traits; track $index) {
        <span>{{ trait.displayValue }}. </span>
      }
    </p>
    @for (ability of asset().abilities; track $index) {
      <p [innerHtml]="ability | withAhSymbols" class="mb-1"></p>
    }
  </div>`,
  styles: ``,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AssetPopoverComponent {
  asset = input.required<PlayerCardBase>();
}
