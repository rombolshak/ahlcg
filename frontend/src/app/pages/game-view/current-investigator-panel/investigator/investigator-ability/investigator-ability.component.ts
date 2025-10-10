import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
} from '@angular/core';
import { Faction } from 'shared/domain/entities/player-card.model';
import { ImagesUrlService } from 'shared/services/images-url.service';
import { WithAhSymbolsPipe } from 'shared/ui/pipes/with-ah-symbols.pipe';

@Component({
  selector: 'ah-investigator-ability',
  imports: [WithAhSymbolsPipe],
  templateUrl: './investigator-ability.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'relative bg-(image:--bgUrl) bg-cover bg-center',
    '[style.--bgUrl]':
      '"url(" + imagesService.getUrl(["card-template", "investigator-details", faction()]) + ")"',
  },
})
export class InvestigatorAbilityComponent {
  readonly faction = input.required<Faction>();
  readonly text = input.required<string>();

  protected readonly imagesService = inject(ImagesUrlService);
}
