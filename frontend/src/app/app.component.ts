import { Component } from '@angular/core';
import { NgOptimizedImage } from '@angular/common';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'ah-root',
  imports: [NgOptimizedImage, RouterOutlet],
  template: `
    <img
      alt="bg"
      ngSrc="/assets/images/bg-min.jpg"
      fill
      priority
      class="-z-50"
    />
    <router-outlet />
  `,
  host: {
    class: 'block h-screen w-screen',
  },
})
// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class AppComponent {}
