import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { NgOptimizedImage } from '@angular/common';
import { CreateOverlay, ImagesUrlService } from 'services/images-url.service';
import { PlayerCardBase } from 'models/player-card.model';
import { DisplayOptions } from 'models/display.options';

@Component({
  selector: 'ah-card-skills',
  imports: [NgOptimizedImage],
  template: `
    @for (skill of card().skills; track $index) {
      @for (_ of [].constructor(skill[1]); track $index) {
        <div class="relative flex items-center">
          <img
            [ngSrc]="
              imagesService.getOverlay(CreateOverlay.skillBox(card().class))
            "
            [width]="skillBox[displayOptions().cardSize].w"
            [height]="skillBox[displayOptions().cardSize].h"
          />
          <img
            [ngSrc]="
              imagesService.getOverlay(CreateOverlay.skillIcon(skill[0]))
            "
            [width]="skillIcon[displayOptions().cardSize]"
            [height]="skillIcon[displayOptions().cardSize]"
            class="absolute
          group-data-[size=l]:left-3 group-data-[size=l]:top-[9px]
          group-data-[size=m]:left-2 group-data-[size=m]:top-[5px]
          group-data-[size=s]:left-1.5 group-data-[size=s]:top-[4px]"
          />
        </div>
      }
    }
  `,
  styles: ``,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CardSkillsComponent {
  constructor(protected imagesService: ImagesUrlService) {}

  card = input.required<PlayerCardBase>();
  displayOptions = input.required<DisplayOptions>();
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
