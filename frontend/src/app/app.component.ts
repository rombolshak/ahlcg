import { NgOptimizedImage } from '@angular/common';
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'ah-root',
  imports: [NgOptimizedImage, RouterOutlet],
  template: `
    <img
      alt="bg"
      ngSrc="/assets/images/bg-min.png"
      fill
      priority
      class="-z-50"
    />
    <router-outlet />
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'block h-screen w-screen',
  },
})
// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class AppComponent {}
