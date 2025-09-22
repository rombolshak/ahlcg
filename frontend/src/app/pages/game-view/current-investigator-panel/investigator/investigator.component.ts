import { NgOptimizedImage } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
} from '@angular/core';
import { TranslocoDirective } from '@jsverse/transloco';
import { DisplayOptions } from 'shared/domain/display.options';
import { Investigator } from 'shared/domain/entities/investigator.model';
import { CardInfoService } from 'shared/services/card-info.service';
import { ImagesUrlService } from 'shared/services/images-url.service';
import { VitalsBarComponent } from '../../../../shared/ui/components/vitals-bar/vitals-bar.component';
import { CardOutlineDirective } from '../../../../shared/ui/directives/card-outline.directive';
import { InvestigatorAbilityComponent } from './investigator-ability/investigator-ability.component';
import { InvestigatorSkillsComponent } from './investigator-skills/investigator-skills.component';
import { InvestigatorSubtitleComponent } from './investigator-subtitle/investigator-subtitle.component';
import { InvestigatorTitleComponent } from './investigator-title/investigator-title.component';
import { InvestigatorTokensComponent } from './investigator-tokens/investigator-tokens.component';

@Component({
  selector: 'ah-investigator',
  imports: [
    NgOptimizedImage,
    TranslocoDirective,
    VitalsBarComponent,
    CardOutlineDirective,
    InvestigatorTitleComponent,
    InvestigatorSubtitleComponent,
    InvestigatorSkillsComponent,
    InvestigatorTokensComponent,
    InvestigatorAbilityComponent,
  ],
  templateUrl: './investigator.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InvestigatorComponent {
  readonly investigator = input.required<Investigator>();
  readonly hovered = input<boolean>(false);

  protected readonly imagesService = inject(ImagesUrlService);
  protected displayOptions: DisplayOptions = { cardSize: 's', textSize: 's' };

  private readonly cardInfoService = inject(CardInfoService);
  protected readonly info = this.cardInfoService.getCardInfo(this.investigator);
}
