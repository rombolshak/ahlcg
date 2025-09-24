import { NgOptimizedImage } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
} from '@angular/core';
import { TokenType } from 'shared/domain/entities/details/card.tokens';
import { Faction } from 'shared/domain/entities/player-card.model';
import { ImagesUrlService } from 'shared/services/images-url.service';
import { NumericTextComponent } from '../../../../../../shared/ui/components/numeric-text/numeric-text.component';

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
  readonly faction = input.required<Faction>();
  readonly type = input.required<TokenType>();
  readonly value = input.required<number | undefined>();

  protected readonly imagesService = inject(ImagesUrlService);
}
