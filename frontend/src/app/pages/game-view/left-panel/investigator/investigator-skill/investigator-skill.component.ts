import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
} from '@angular/core';
import { NgOptimizedImage } from '@angular/common';
import {
  PlayerCardClassType,
  SkillType,
} from 'shared/domain/player-card.model';
import {
  CreateOverlay,
  ImagesUrlService,
} from 'shared/services/images-url.service';

@Component({
  selector: 'ah-investigator-skill',
  imports: [NgOptimizedImage],
  templateUrl: './investigator-skill.component.html',
  host: {
    class: 'relative flex w-16 h-10 justify-between items-center pl-2 pr-4',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InvestigatorSkillComponent {
  readonly type = input.required<SkillType>();
  readonly value = input.required<number>();
  readonly investigatorClass = input.required<PlayerCardClassType>();

  protected readonly imagesService = inject(ImagesUrlService);
  protected readonly CreateOverlay = CreateOverlay;
}
