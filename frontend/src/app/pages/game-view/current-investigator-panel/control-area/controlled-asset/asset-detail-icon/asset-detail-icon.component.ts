import { NgOptimizedImage } from '@angular/common';
import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'ah-asset-detail-icon',
  imports: [NgOptimizedImage],
  template: `
    @if (detail()) {
      <div class="relative flex h-6 w-6 items-center justify-center">
        <img fill alt="" [ngSrc]="image()" />
        @if (!withoutText()) {
          <span class="z-10 font-[Teutonic] text-lg text-white">
            {{ detail() }}
          </span>
        }
      </div>
    }
  `,
  styles: ``,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AssetDetailIconComponent {
  readonly detail = input.required<string | number | undefined>();
  readonly withoutText = input<boolean>(false);
  readonly image = input.required<string>();
}
