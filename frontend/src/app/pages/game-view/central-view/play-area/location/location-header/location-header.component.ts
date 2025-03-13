import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
} from '@angular/core';
import { CardDetailsTextComponent } from '../../../../components/card-details-text/card-details-text.component';
import { ImagesUrlService } from 'shared/services/images-url.service';
import { Location } from 'shared/domain/location.model';
import { TextWithOverlayComponent } from 'shared/ui/components/text-with-overlay/text-with-overlay.component';
import { NgOptimizedImage } from '@angular/common';

@Component({
  selector: 'ah-location-header',
  imports: [
    CardDetailsTextComponent,
    TextWithOverlayComponent,
    NgOptimizedImage,
  ],
  templateUrl: './location-header.component.html',
  host: {
    class:
      'flex items-center justify-between flex-row-reverse w-full bg-zinc-200/80 h-16 rounded-t-3xl z-0',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LocationHeaderComponent {
  imageService = inject(ImagesUrlService);
  readonly location = input.required<Location>();
}
