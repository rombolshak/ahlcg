import { Component } from '@angular/core';
import { NgOptimizedImage } from '@angular/common';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'ah-root',
  imports: [NgOptimizedImage, RouterOutlet],
  template: `
    <img ngSrc="/assets/images/bg-min.jpg" fill priority class="-z-50" />
    <router-outlet></router-outlet>
  `,
  styles: `
    :host {
      @apply block h-screen w-screen;
    }
  `,
})
export class AppComponent {}
