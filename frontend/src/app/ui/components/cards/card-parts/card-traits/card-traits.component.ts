import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { DisplayOptions } from '@domain/display.options';
import { CardInfo } from '@domain/entities/details/card-info.model';
import { TranslocoDirective } from '@jsverse/transloco';

@Component({
  selector: 'ah-card-traits',
  imports: [TranslocoDirective],
  templateUrl: './card-traits.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CardTraitsComponent {
  readonly card = input.required<CardInfo>();
  readonly displayOptions = input.required<DisplayOptions>();
}
