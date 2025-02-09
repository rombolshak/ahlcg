import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
} from '@angular/core';
import { ImagesUrlService } from 'shared/services/images-url.service';
import { NgOptimizedImage } from '@angular/common';
import { Location } from 'shared/domain/location.model';
import { TextWithOverlayComponent } from 'shared/ui/components/text-with-overlay/text-with-overlay.component';
import { CardDetailsTextComponent } from '../../card-details-text/card-details-text.component';

@Component({
  selector: 'ah-location',
  imports: [
    NgOptimizedImage,
    TextWithOverlayComponent,
    CardDetailsTextComponent,
  ],
  templateUrl: './location.component.html',
  host: {
    class: 'flex flex-col',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LocationComponent {
  imageService = inject(ImagesUrlService);
  readonly location = input.required<Location>();
}
