import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
} from '@angular/core';
import { Faction } from 'shared/domain/entities/player-card.model';
import { ImagesUrlService } from 'shared/services/images-url.service';

@Component({
  selector: 'ah-investigator-subtitle',
  imports: [],
  templateUrl: './investigator-subtitle.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'relative mx-4 bg-(image:--bgUrl) bg-cover bg-center',
    '[style.--bgUrl]':
      '"url(" + imagesService.getUrl(["card-overlay", "subtitle", faction()]) + ")"',
  },
})
export class InvestigatorSubtitleComponent {
  readonly text = input.required<string>();
  readonly faction = input.required<Faction>();

  protected readonly imagesService = inject(ImagesUrlService);
}
