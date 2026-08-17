import { NgOptimizedImage } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { ImagesUrlService } from '@core/images-url.service';
import { CardTokens } from '@domain/entities/details/card.tokens';
import { Faction } from '@domain/entities/player-card.model';
import { InvestigatorTokenComponent } from './investigator-token/investigator-token.component';

@Component({
  selector: 'ah-investigator-tokens',
  imports: [NgOptimizedImage, InvestigatorTokenComponent],
  templateUrl: './investigator-tokens.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'relative',
  },
})
export class InvestigatorTokensComponent {
  protected readonly imagesService = inject(ImagesUrlService);

  readonly faction = input.required<Faction>();
  readonly tokens = input.required<CardTokens | undefined>();
}
