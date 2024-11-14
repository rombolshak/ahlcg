import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { NgOptimizedImage } from '@angular/common';
import { TrimStartPipe } from '../../pipes/trim-start.pipe';
import { CardBase } from '../../models/card-base.model';
import { ImagesUrlService } from '../../services/images-url.service';

@Component({
  selector: 'ah-card-copyright',
  standalone: true,
  imports: [NgOptimizedImage, TrimStartPipe],
  template: `
    <div
      class="absolute bottom-px flex h-3 w-full justify-between font-sans text-xxs text-white"
    >
      <span class="absolute left-6 top-0"
        >Illus. {{ card().copyright.illustrator }}</span
      >
      <span class="absolute left-0 top-0 w-full text-center"
        >&copy; {{ card().copyright.ffg }} FFG</span
      >
      <span class="absolute right-6 top-0">
        <img
          [ngSrc]="imagesService.getSetIcon(card().setInfo.set)"
          width="12"
          height="12"
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

  card = input.required<CardBase>();
}
