import { NgOptimizedImage } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { Investigator } from '@domain/entities/investigator.model';
import { TranslocoDirective } from '@jsverse/transloco';
import { CardInfoService } from '@services/card-info.service';
import { ImagesUrlService } from '@services/images-url.service';
import { CardFactionBackgroundDirective } from '@shared/directives/cards/card-faction-background.directive';
import { CardOutlineDirective } from '@shared/directives/cards/card-outline.directive';
import { VitalsBarComponent } from '../../../../shared/ui/components/vitals-bar/vitals-bar.component';
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
    CardFactionBackgroundDirective,
  ],
  templateUrl: './investigator.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InvestigatorComponent {
  protected readonly imagesService = inject(ImagesUrlService);
  private readonly cardInfoService = inject(CardInfoService);

  readonly investigator = input.required<Investigator>();

  protected readonly info = this.cardInfoService.getCardInfo(this.investigator);
}
