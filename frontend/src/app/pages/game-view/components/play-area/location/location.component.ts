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
    <div class="w-full bg-orange-100 h-16">
      <p class="font-conkordia text-4xl/[4rem] text-center w-full h-16">
        {{ location().title }}
      </p>
    </div>
    <img
      [ngSrc]="imageService.getIllustration(location().setInfo)"
      width="704"
      height="428"
    />
  `,
  host: {
    class: 'flex flex-col',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LocationComponent {
  imageService = inject(ImagesUrlService);
  location = input.required<CardInfo>();
}
