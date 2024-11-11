import {
  ChangeDetectionStrategy,
  Component,
  input
} from '@angular/core';
import { NgOptimizedImage } from '@angular/common';
import { WithAhSymbolsPipe } from '../../pipes/with-ah-symbols.pipe';
import { TrimStartPipe } from '../../pipes/trim-start.pipe';
import { ImagesUrlService, CreateOverlay } from '../../services/images-url.service';
import { AssetCard } from '../../models/player-card.model';

@Component({
  selector: 'ah-asset-card',
  standalone: true,
  imports: [NgOptimizedImage, WithAhSymbolsPipe, TrimStartPipe],
  templateUrl: './asset-card.component.html',
  styles: `
    :host {
    @apply relative block w-card h-card;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AssetCardComponent {
  constructor(public imagesService: ImagesUrlService) {
  }

  card = input.required<AssetCard>();

  illustrationHeight = 273;

  protected readonly CreateOverlay = CreateOverlay;
  protected readonly cardWidth = 375;
  protected readonly cardHeight = 575;
}
