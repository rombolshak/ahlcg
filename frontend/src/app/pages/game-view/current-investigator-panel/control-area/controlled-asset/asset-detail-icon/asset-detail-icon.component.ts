import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { CreateOverlay } from 'shared/services/images-url.service';
import { NgOptimizedImage } from '@angular/common';

@Component({
  selector: 'ah-asset-detail-icon',
  imports: [NgOptimizedImage],
  template: `
    @if (detail()) {
      <div class="relative flex justify-center items-center w-6 h-6">
        <img fill alt="" [ngSrc]="image()" />
        @if (!withoutText()) {
          <span class="z-10 text-lg text-white font-[Teutonic]">
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
  protected readonly CreateOverlay = CreateOverlay;
}
