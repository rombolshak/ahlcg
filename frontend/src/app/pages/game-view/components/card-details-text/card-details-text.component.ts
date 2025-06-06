import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { WithAhSymbolsPipe } from 'shared/ui/pipes/with-ah-symbols.pipe';
import { CardInfo } from 'shared/domain/entities/details/card-info.model';

@Component({
  selector: 'ah-card-details-text',
  imports: [WithAhSymbolsPipe],
  templateUrl: './card-details-text.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CardDetailsTextComponent {
  readonly card = input.required<CardInfo>();
  readonly showTitle = input<boolean>(true);
}
