import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
} from '@angular/core';
import { GameCard } from '@domain/entities/card.model';
import { TranslocoDirective } from '@jsverse/transloco';
import { CardInfoService } from 'shared/services/card-info.service';
import { WithAhSymbolsPipe } from 'shared/ui/pipes/with-ah-symbols.pipe';

@Component({
  selector: 'ah-card-details-text',
  imports: [WithAhSymbolsPipe, TranslocoDirective],
  templateUrl: './card-details-text.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CardDetailsTextComponent {
  private readonly cardInfoService = inject(CardInfoService);
  readonly card = input.required<GameCard>();
  readonly showTitle = input<boolean>(true);
  readonly cardInfo = this.cardInfoService.getCardInfo(this.card);
}
