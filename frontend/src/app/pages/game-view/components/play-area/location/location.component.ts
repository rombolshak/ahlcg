import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
} from '@angular/core';
import { ImagesUrlService } from 'services/images-url.service';
import { CardInfo } from 'models/card-info.model';
import { NgOptimizedImage } from '@angular/common';

@Component({
  selector: 'ah-location',
  imports: [NgOptimizedImage],
  template: `
    <img
      [ngSrc]="imageService.getIllustration(location().setInfo)"
      width="690"
      height="420"
      class="outline outline-2 outline-stone-200 rounded"
    />
  `,
  styles: ``,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LocationComponent {
  imageService = inject(ImagesUrlService);
  location = input.required<CardInfo>();
}
