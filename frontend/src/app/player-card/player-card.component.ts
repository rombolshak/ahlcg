import {
  ChangeDetectionStrategy,
  Component,
  input
} from '@angular/core';
import { NgOptimizedImage } from '@angular/common';
import { PlayerCard } from '../models/player-card.model';
import { WithAhSymbolsPipe } from '../pipes/with-ah-symbols.pipe';
import { TrimStartPipe } from '../pipes/trim-start.pipe';
import { CreateOverlay, ImagesUrlService } from '../services/images-url.service';

@Component({
  selector: 'ah-player-card',
  standalone: true,
  imports: [NgOptimizedImage, WithAhSymbolsPipe, TrimStartPipe],
  templateUrl: './player-card.component.html',
  styles: `
    :host {
    @apply relative block;
      width: 375px;
      height: 525px;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PlayerCardComponent {
  constructor(public imagesService: ImagesUrlService) {
  }

  card = input.required<PlayerCard>();

  cardWidth = 375;
  cardHeight = 525;
  illustrationHeight = 273;

  protected readonly CreateOverlay = CreateOverlay;
}
