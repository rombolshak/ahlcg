import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
} from '@angular/core';
import { ImagesUrlService } from 'services/images-url.service';
import { NgOptimizedImage } from '@angular/common';
import { Location } from 'models/location.model';
import { TextWithOverlayComponent } from '../../../../../components/text-with-overlay/text-with-overlay.component';

@Component({
  selector: 'ah-location',
  imports: [NgOptimizedImage, TextWithOverlayComponent],
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
