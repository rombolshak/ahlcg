import { NgOptimizedImage } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { ImagesUrlService } from '@core/images-url.service';
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
  protected readonly imagesService = inject(ImagesUrlService);

  readonly text = input.required<string>();
  readonly faction = input.required<Faction>();
}
