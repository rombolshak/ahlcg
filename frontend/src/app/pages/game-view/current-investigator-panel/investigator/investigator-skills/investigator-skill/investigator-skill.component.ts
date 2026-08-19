import { NgOptimizedImage } from '@angular/common';
import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { imageUrl } from '@domain/card-art/image-url';
import { SkillType } from '@domain/entities/player-card.model';
import { NumericTextComponent } from '@ui/components/numeric-text/numeric-text.component';

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
  protected readonly imageUrl = imageUrl;

  readonly type = input.required<SkillType>();
  readonly value = input.required<number>();
}
