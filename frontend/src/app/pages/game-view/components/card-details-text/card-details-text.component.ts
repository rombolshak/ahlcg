import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
} from '@angular/core';
import { WithAhSymbolsPipe } from 'shared/ui/pipes/with-ah-symbols.pipe';
import { CardInfoService } from 'shared/services/card-info.service';
import { GameCard } from '../../../../shared/domain/entities/card.model';

@Component({
  selector: 'ah-card-details-text',
  imports: [WithAhSymbolsPipe],
  templateUrl: './card-details-text.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CardDetailsTextComponent {
  private readonly cardInfoService = inject(CardInfoService);
  readonly card = input.required<GameCard>();
  readonly showTitle = input<boolean>(true);
  readonly cardInfo = this.cardInfoService.getCardInfo(this.card);
}
