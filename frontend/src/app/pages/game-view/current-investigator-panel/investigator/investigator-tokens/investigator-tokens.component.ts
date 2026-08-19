import { NgOptimizedImage } from '@angular/common';
import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { imageUrl } from '@domain/card-art/image-url';
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
  protected readonly imageUrl = imageUrl;

  readonly faction = input.required<Faction>();
  readonly tokens = input.required<CardTokens | undefined>();
}
