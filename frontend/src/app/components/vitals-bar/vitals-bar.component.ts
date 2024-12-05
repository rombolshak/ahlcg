import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { WithHealth } from 'models/player-card.model';
import { AssetState } from 'models/asset.state';
import { SingleBarComponent } from './single-bar/single-bar.component';

@Component({
  selector: 'ah-vitals-bar',
  imports: [SingleBarComponent],
  template: ` <div
    class="group bg-gray-950/70 rounded data-[orientation=horizontal]:px-1 data-[orientation=vertical]:py-1 data-[orientation=vertical]:flex data-[orientation=horizontal]:w-full data-[orientation=vertical]:h-full"
    [attr.data-orientation]="orientation()"
  >
    @if (state()) {
      @if (asset().sanity) {
        <ah-single-bar
          class="group-data-[orientation=horizontal]:h-2 group-data-[orientation=horizontal]:mb-1 group-data-[orientation=horizontal]:mt-1
          group-data-[orientation=vertical]:w-2 group-data-[orientation=vertical]:flex group-data-[orientation=vertical]:flex-col group-data-[orientation=vertical]:mr-1 group-data-[orientation=vertical]:ml-1 rounded-md"
          [max]="asset().sanity!"
          [current]="state()?.horror ?? -1"
          badColor="border-sky-700"
          goodColor="border-sky-300"
          [orientation]="orientation()"
        ></ah-single-bar>
      }
      @if (asset().health) {
        <ah-single-bar
          class="group-data-[orientation=horizontal]:h-2 group-data-[orientation=horizontal]:mb-1 group-data-[orientation=horizontal]:mt-1
          group-data-[orientation=vertical]:w-2 group-data-[orientation=vertical]:flex group-data-[orientation=vertical]:flex-col group-data-[orientation=vertical]:mr-1 group-data-[orientation=vertical]:ml-1 rounded-md"
          [max]="asset().health!"
          [current]="state()?.damage ?? -1"
          badColor="border-red-700"
          goodColor="border-red-300"
          [orientation]="orientation()"
        ></ah-single-bar>
      }
    }
  </div>`,
  styles: `
    :host {
      display: block;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VitalsBarComponent {
  asset = input.required<Partial<WithHealth>>();
  state = input<AssetState>();
  orientation = input<'horizontal' | 'vertical'>('horizontal');
}
