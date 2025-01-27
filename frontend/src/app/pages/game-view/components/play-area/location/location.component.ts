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
  template: `
    <div
      class="flex items-center justify-between flex-row-reverse w-full bg-zinc-200/80 h-16 rounded-t-3xl z-0"
    >
      <p class="font-[Conkordia] text-4xl text-center w-full absolute">
        {{ location().title }}
      </p>
      <div
        class="flex m-1 *:flex *:items-center *:justify-center *:ml-1 *:w-[56px] *:h-[56px] *:rounded-full *:text-5xl *:font-[Teutonic] *:relative"
      >
        <div class="bg-stone-900 text-white">
          {{ location().shroud }}
        </div>
        <div>
          <img
            [ngSrc]="imageService.getSimpleOverlay('clue')"
            fill
            class="-z-10"
          />
          <p class="absolute -z-10" style="-webkit-text-stroke-width: medium">
            {{ location().clues }}
          </p>
          <p class="text-white">{{ location().clues }}</p>
        </div>
      </div>
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
  location = input.required<Location>();
}
