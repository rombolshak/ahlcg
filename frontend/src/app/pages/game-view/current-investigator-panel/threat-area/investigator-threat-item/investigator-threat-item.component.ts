import { NgOptimizedImage } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
} from '@angular/core';
import { TranslocoDirective } from '@jsverse/transloco';
import { Enemy } from 'shared/domain/entities/enemy.model';
import { CardInfoService } from 'shared/services/card-info.service';
import { ImagesUrlService } from 'shared/services/images-url.service';
import { VitalsBarComponent } from 'shared/ui/components/vitals-bar/vitals-bar.component';
import { InvestigatorSkillComponent } from '../../investigator/investigator-skills/investigator-skill/investigator-skill.component';

@Component({
  selector: 'ah-investigator-threat-item',
  imports: [
    NgOptimizedImage,
    TranslocoDirective,
    VitalsBarComponent,
    InvestigatorSkillComponent,
  ],
  templateUrl: './investigator-threat-item.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'relative flex p-2 gap-2',
  },
})
export class InvestigatorThreatItemComponent {
  readonly enemy = input.required<Enemy>();
  protected readonly imagesService = inject(ImagesUrlService);
  protected readonly info = inject(CardInfoService).getCardInfo(this.enemy);
}
