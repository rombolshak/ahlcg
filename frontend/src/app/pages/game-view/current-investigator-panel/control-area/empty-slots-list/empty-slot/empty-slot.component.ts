import { NgOptimizedImage } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
} from '@angular/core';
import { AssetSlot } from 'shared/domain/entities/player-card.model';
import { ImagesUrlService } from 'shared/services/images-url.service';

@Component({
  selector: 'ah-empty-slot',
  imports: [NgOptimizedImage],
  templateUrl: './empty-slot.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class:
      'bg-radial from-gray-500/80 to-gray-900/8 outline outline-2 flex items-center justify-center',
  },
})
export class EmptySlotComponent {
  readonly slot = input.required<AssetSlot>();
  protected readonly imagesUrlService = inject(ImagesUrlService);
}
