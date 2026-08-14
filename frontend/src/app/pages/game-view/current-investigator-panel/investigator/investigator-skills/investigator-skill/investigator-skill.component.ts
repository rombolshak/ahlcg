import { NgOptimizedImage } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { SkillType } from '@domain/entities/player-card.model';
import { ImagesUrlService } from '@services/images-url.service';
import { NumericTextComponent } from '@shared/components/numeric-text/numeric-text.component';

@Component({
  selector: 'ah-investigator-skill',
  imports: [NgOptimizedImage, NumericTextComponent],
  templateUrl: './investigator-skill.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'relative flex items-center gap-1',
  },
})
export class InvestigatorSkillComponent {
  protected readonly imagesService = inject(ImagesUrlService);

  readonly type = input.required<SkillType>();
  readonly value = input.required<number>();
}
