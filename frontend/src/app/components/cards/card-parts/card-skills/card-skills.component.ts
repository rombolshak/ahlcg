import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { NgOptimizedImage } from '@angular/common';
import { CreateOverlay, ImagesUrlService } from 'services/images-url.service';
import { PlayerCardBase } from 'models/player-card.model';
import { DisplayOptions } from 'models/display.options';

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
