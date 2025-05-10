import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { CardInfo } from 'shared/domain/entities/details/card-info.model';
import { DisplayOptions } from 'shared/domain/display.options';

@Component({
  selector: 'ah-card-traits',
  imports: [],
  templateUrl: './card-traits.component.html',
  changeDetection: ChangeDetectionStrategy.Default,
})
export class CardTraitsComponent {
  readonly card = input.required<CardInfo>();
  readonly displayOptions = input.required<DisplayOptions>();
}
