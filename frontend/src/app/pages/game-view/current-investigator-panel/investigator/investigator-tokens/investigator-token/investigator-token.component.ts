import { NgOptimizedImage } from '@angular/common';
import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { imageUrl } from '@domain/card-art/image-url';
import { TokenType } from '@domain/entities/details/card.tokens';
import { Faction } from '@domain/entities/player-card.model';
import { NumericTextComponent } from '@ui/components/numeric-text/numeric-text.component';

@Component({
  selector: 'ah-investigator-token',
  imports: [NgOptimizedImage, NumericTextComponent],
  templateUrl: './investigator-token.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'relative flex h-16 justify-between items-center gap-1',
  },
})
export class InvestigatorTokenComponent {
  protected readonly imageUrl = imageUrl;

  readonly faction = input.required<Faction>();
  readonly type = input.required<TokenType>();
  readonly value = input.required<number | undefined>();
}
