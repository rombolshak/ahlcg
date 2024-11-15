import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { NgOptimizedImage } from '@angular/common';
import {
  CreateOverlay,
  ImagesUrlService,
} from '../../services/images-url.service';
import { PlayerCardBase } from '../../models/player-card.model';

@Component({
  selector: 'ah-card-skills',
  standalone: true,
  imports: [NgOptimizedImage],
  template: `
    @for (skill of card().skills; track $index) {
      <div class="relative flex items-center">
        <img
          [ngSrc]="
            imagesService.getOverlay(CreateOverlay.skillBox(card().class))
          "
          [width]="skillBox[card().displayOptions.cardSize].w"
          [height]="skillBox[card().displayOptions.cardSize].h"
        />
        <img
          [ngSrc]="imagesService.getOverlay(CreateOverlay.skillIcon(skill))"
          [width]="skillIcon[card().displayOptions.cardSize]"
          [height]="skillIcon[card().displayOptions.cardSize]"
          class="absolute
          group-data-[size=l]:left-3 group-data-[size=l]:top-[9px]
          group-data-[size=m]:left-2 group-data-[size=m]:top-[5px]
          group-data-[size=s]:left-1 group-data-[size=s]:top-[2px]"
        />
      </div>
    }
  `,
  styles: ``,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CardSkillsComponent {
  constructor(protected imagesService: ImagesUrlService) {}

  card = input.required<PlayerCardBase>();

  skillBox = {
    l: { w: 54, h: 42 },
    m: { w: 36, h: 28 },
    s: { w: 18, h: 14 },
  };
  skillIcon = {
    l: 24,
    m: 16,
    s: 8,
  };
  protected readonly CreateOverlay = CreateOverlay;
}
