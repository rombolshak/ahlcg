import { NgOptimizedImage } from '@angular/common';
import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { imageUrl } from '@domain/card-art/image-url';
import { AssetSlot } from '@domain/entities/player-card.model';

@Component({
  selector: 'ah-empty-slot',
  imports: [NgOptimizedImage],
  templateUrl: './empty-slot.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'bg-radial from-gray-500/80 to-gray-900/8 outline outline-2 flex items-center justify-center',
  },
})
export class EmptySlotComponent {
  protected readonly imageUrl = imageUrl;

  readonly slot = input.required<AssetSlot>();
}
