import { NgOptimizedImage } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { Faction } from '@domain/entities/player-card.model';
import { ImagesUrlService } from '@services/images-url.service';

@Component({
  selector: 'ah-investigator-subtitle',
  imports: [NgOptimizedImage],
  templateUrl: './investigator-subtitle.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'relative mx-4',
  },
})
export class InvestigatorSubtitleComponent {
  protected readonly imagesService = inject(ImagesUrlService);

  readonly text = input.required<string>();
  readonly faction = input.required<Faction>();
}
