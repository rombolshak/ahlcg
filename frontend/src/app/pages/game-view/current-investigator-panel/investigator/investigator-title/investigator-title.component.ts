import { NgOptimizedImage } from '@angular/common';
import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { imageUrl } from '@domain/card-art/image-url';
import { Faction } from '@domain/entities/player-card.model';

@Component({
  selector: 'ah-investigator-title',
  imports: [NgOptimizedImage],
  templateUrl: './investigator-title.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'relative',
  },
})
export class InvestigatorTitleComponent {
  protected readonly imageUrl = imageUrl;

  readonly text = input.required<string>();
  readonly faction = input.required<Faction>();
}
