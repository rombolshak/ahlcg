import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
} from '@angular/core';
import { ImagesUrlService } from 'services/images-url.service';
import { NgOptimizedImage } from '@angular/common';
import { Location } from 'models/location.model';

@Component({
  selector: 'ah-location',
  imports: [NgOptimizedImage],
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
