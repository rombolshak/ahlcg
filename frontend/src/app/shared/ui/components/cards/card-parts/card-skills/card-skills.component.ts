import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from '@angular/core';
import { NgOptimizedImage } from '@angular/common';
import {
  CreateOverlay,
  ImagesUrlService,
} from 'shared/services/images-url.service';
import { PlayerCardBase, SkillType } from 'shared/domain/player-card.model';
import { DisplayOptions } from 'shared/domain/display.options';

@Component({
  selector: 'ah-card-skills',
  imports: [NgOptimizedImage],
  templateUrl: './card-skills.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CardSkillsComponent {
  constructor(protected imagesService: ImagesUrlService) {}

  readonly card = input.required<PlayerCardBase>();
  readonly displayOptions = input.required<DisplayOptions>();

  protected readonly skills = computed(() => {
    const s = Object.keys(this.card().skills) as SkillType[];
    return s.map((skill) => ({
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
  protected readonly CreateOverlay = CreateOverlay;
}
