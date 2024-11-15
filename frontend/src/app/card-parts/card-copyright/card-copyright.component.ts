import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { NgOptimizedImage } from '@angular/common';
import { TrimStartPipe } from '../../pipes/trim-start.pipe';
import { CardBase } from '../../models/card-base.model';
import { ImagesUrlService } from '../../services/images-url.service';
import { PlayerCardBase } from '../../models/player-card.model';

@Component({
  selector: 'ah-card-copyright',
  standalone: true,
  imports: [NgOptimizedImage, TrimStartPipe],
  template: `
    <div
      class="absolute bottom-px h-3 w-full font-sans text-white group-data-[size=l]:text-[9px] group-data-[size=m]:text-[6px] group-data-[size=s]:text[3px]"
    >
      <span class="absolute left-6 bottom-0"
        >Illus. {{ card().copyright.illustrator }}</span
      >
      <span class="absolute left-0 bottom-0 w-full text-center"
        >&copy; {{ card().copyright.ffg }} FFG</span
      >
      <span class="absolute right-6 bottom-0">
        <img
          [ngSrc]="imagesService.getSetIcon(card().setInfo.set)"
          [width]="iconSize[card().displayOptions.cardSize]"
          [height]="iconSize[card().displayOptions.cardSize]"
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
  iconSize = {
    l: 12,
    m: 8,
    s: 4,
  };
}
