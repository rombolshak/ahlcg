import { NgOptimizedImage } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { InvestigatorSkills } from '@domain/entities/investigator.model';
import { Faction } from '@domain/entities/player-card.model';
import { ImagesUrlService } from '@services/images-url.service';
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
  readonly faction = input.required<Faction>();
  readonly skills = input.required<InvestigatorSkills>();

  protected readonly imagesService = inject(ImagesUrlService);
}
