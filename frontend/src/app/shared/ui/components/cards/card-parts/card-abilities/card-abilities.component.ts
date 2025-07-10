import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { WithAhSymbolsPipe } from 'shared/ui/pipes/with-ah-symbols.pipe';
import { DisplayOptions } from 'shared/domain/display.options';
import { CardInfo } from 'shared/domain/entities/details/card-info.model';
import { TranslocoDirective } from '@jsverse/transloco';

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
