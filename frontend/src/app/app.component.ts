import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { cardA, cardE, cardS } from './models/test/test-cards';
import { NgOptimizedImage } from '@angular/common';
import { CardsHandComponent } from './cards-hand/cards-hand.component';

@Component({
  selector: 'ah-root',
  standalone: true,
  imports: [RouterOutlet, NgOptimizedImage, CardsHandComponent],
  template:
    '<img ngSrc="/assets/images/bg-min.jpg" fill priority class="-z-50" />' +
    '<ah-cards-hand [cards]="[cardE, cardA, cardS, cardE, cardA, cardS]" class="col-start-4 col-span-10 row-start-9"></ah-cards-hand>',
  styles: `
    :host {
      @apply grid grid-cols-16 grid-rows-9 h-screen w-screen;
    }
  `,
})
export class AppComponent {}
