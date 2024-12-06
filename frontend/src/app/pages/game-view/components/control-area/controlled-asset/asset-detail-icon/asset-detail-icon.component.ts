import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { CreateOverlay } from 'services/images-url.service';
import { NgOptimizedImage } from '@angular/common';

@Component({
  selector: 'ah-asset-detail-icon',
  imports: [NgOptimizedImage],
  template: `@if (detail()) {
    <div class="relative flex justify-center items-center w-6 h-6">
      <img [ngSrc]="image()" fill />
      @if (!withoutText()) {
        <span class="z-10 text-lg text-white font-teutonic">{{
          detail()
        }}</span>
      }
    </div>
  }`,
  styles: ``,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AssetDetailIconComponent {
  detail = input.required<unknown | undefined>();
  withoutText = input<Boolean>(false);
  image = input.required<string>();
  protected readonly CreateOverlay = CreateOverlay;
}
