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
} from 'shared/domain/entities/player-card.model';
import {
  CreateOverlay,
  ImagesUrlService,
} from 'shared/services/images-url.service';
import { NumericTextComponent } from '../../../../../shared/ui/components/numeric-text/numeric-text.component';

@Component({
  selector: 'ah-investigator-skill',
  imports: [NgOptimizedImage, NumericTextComponent],
  templateUrl: './investigator-skill.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'relative flex w-16 h-10 justify-between items-center pl-2 pr-4',
  },
})
export class InvestigatorSkillComponent {
  readonly type = input.required<SkillType>();
  readonly value = input.required<number>();
  readonly investigatorClass = input.required<PlayerCardClassType>();

  protected readonly imagesService = inject(ImagesUrlService);
  protected readonly CreateOverlay = CreateOverlay;
}
