import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { DisplayOptions } from '@domain/display.options';
import { CardInfo } from '@domain/entities/details/card-info.model';
import { TranslocoDirective } from '@jsverse/transloco';
import { WithAhSymbolsPipe } from '@ui/pipes/with-ah-symbols.pipe';

@Component({
  selector: 'ah-card-abilities',
  imports: [WithAhSymbolsPipe, TranslocoDirective],
  templateUrl: './card-abilities.component.html',
  styles: ``,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CardAbilitiesComponent {
  readonly card = input.required<CardInfo>();
  readonly displayOptions = input.required<DisplayOptions>();
}
