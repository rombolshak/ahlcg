import { NgOptimizedImage } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { ImagesUrlService } from '@core/images-url.service';
import { DisplayOptions } from '@domain/display.options';
import { PlayerCardBase, SkillType } from '@domain/entities/player-card.model';

@Component({
  selector: 'ah-card-skills',
  imports: [NgOptimizedImage],
  templateUrl: './card-skills.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CardSkillsComponent {
  protected imagesService = inject(ImagesUrlService);

  readonly card = input.required<PlayerCardBase>();
  readonly displayOptions = input.required<DisplayOptions>();

  protected readonly skills = computed(() => {
    const s = Object.keys(this.card().skills) as SkillType[];
    return s.map(skill => ({
      type: skill,
      value: this.card().skills[skill],
    }));
  });
  skillBox = {
    l: { w: 54, h: 42 },
    m: { w: 36, h: 28 },
    s: { w: 24, h: 19 },
  };
  skillIcon = {
    l: 24,
    m: 16,
    s: 11,
  };
}
