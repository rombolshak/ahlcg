import { ChangeDetectionStrategy, Component } from '@angular/core';
import { ImagesUrlService } from '../../services/images-url.service';
import { NgOptimizedImage } from '@angular/common';
import { cardHeight, cardWidth } from '../constants';

@Component({
  selector: 'ah-player-back-card',
  standalone: true,
  imports: [
    NgOptimizedImage
  ],
  template: `<img [ngSrc]="imagesService.getTemplate('Back', 'Player')"
                  [height]="cardHeight"
                  [width]="cardWidth"
                  class="-z-10 rounded-xl" />`,
  styles: `:host {
  @apply relative block w-card h-card;
  }`,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PlayerBackCardComponent {
  constructor(public imagesService: ImagesUrlService) {
  }

  protected readonly cardHeight = cardHeight;
  protected readonly cardWidth = cardWidth;
}
