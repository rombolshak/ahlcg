import { NgOptimizedImage } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { Faction } from '@domain/entities/player-card.model';
import { ImagesUrlService } from '@services/images-url.service';
import { WithAhSymbolsPipe } from '@shared/pipes/with-ah-symbols.pipe';

@Component({
  selector: 'ah-investigator-ability',
  imports: [WithAhSymbolsPipe, NgOptimizedImage],
  templateUrl: './investigator-ability.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'relative',
  },
})
export class InvestigatorAbilityComponent {
  protected readonly imagesService = inject(ImagesUrlService);

  readonly faction = input.required<Faction>();
  readonly text = input.required<string>();
}
