import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { NgOptimizedImage } from '@angular/common';
import { TrimStartPipe } from 'pipes/trim-start.pipe';
import { ImagesUrlService } from 'services/images-url.service';
import { PlayerCardBase } from 'models/player-card.model';
import { DisplayOptions } from 'models/display.options';

@Component({
  selector: 'ah-card-copyright',
  imports: [NgOptimizedImage, TrimStartPipe],
  template: `
    <div
      class="absolute bottom-px h-3 w-full font-sans text-white group-data-[size=l]:text-[9px] group-data-[size=m]:text-[6px] group-data-[size=s]:text-[4px]"
    >
      <span
        class="absolute group-data-[size=l]:left-6 group-data-[size=m]:left-5 group-data-[size=s]:left-3 bottom-0"
        >Illus. {{ card().copyright.illustrator }}</span
      >
      <span class="absolute left-0 bottom-0 w-full text-center"
        >&copy; {{ card().copyright.ffg }} FFG</span
      >
      <span
        class="absolute group-data-[size=l]:right-6 group-data-[size=m]:right-5 group-data-[size=s]:right-3 bottom-0"
      >
        <img
          [ngSrc]="imagesService.getSetIcon(card().setInfo.set)"
          [width]="iconSize[displayOptions().cardSize]"
          [height]="iconSize[displayOptions().cardSize]"
          class="inline text-white invert"
        />
        {{ card().setInfo.index | trimStart: '0' }}
      </span>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CardCopyrightComponent {
  constructor(protected imagesService: ImagesUrlService) {}

  card = input.required<PlayerCardBase>();
  displayOptions = input.required<DisplayOptions>();
  iconSize = {
    l: 12,
    m: 8,
    s: 4,
  };
}
