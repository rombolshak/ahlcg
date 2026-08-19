import { NgOptimizedImage } from '@angular/common';
import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { imageUrl } from '@domain/card-art/image-url';
import { InvestigatorSkills } from '@domain/entities/investigator.model';
import { Faction } from '@domain/entities/player-card.model';
import { InvestigatorSkillComponent } from './investigator-skill/investigator-skill.component';

@Component({
  selector: 'ah-investigator-skills',
  imports: [InvestigatorSkillComponent, NgOptimizedImage],
  templateUrl: './investigator-skills.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'relative',
  },
})
export class InvestigatorSkillsComponent {
  protected readonly imageUrl = imageUrl;

  readonly faction = input.required<Faction>();
  readonly skills = input.required<InvestigatorSkills>();
}
