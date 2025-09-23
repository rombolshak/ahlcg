import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { TranslocoDirective } from '@jsverse/transloco';
import { DisplayOptions } from 'shared/domain/display.options';
import { CardInfo } from 'shared/domain/entities/details/card-info.model';

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
