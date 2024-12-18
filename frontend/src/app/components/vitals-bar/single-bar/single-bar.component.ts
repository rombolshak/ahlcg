import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { NgClass } from '@angular/common';

@Component({
  selector: 'ah-single-bar',
  imports: [NgClass],
  template: ` <div
    class="group w-full h-full flex *:flex-1 data-[orientation=horizontal]:flex-row-reverse data-[orientation=vertical]:flex-col"
    [attr.data-orientation]="orientation()"
  >
    @for (_ of [].constructor(max()); track $index) {
      @if ($index < current()) {
        <div
          class="border-4 group-data-[orientation=horizontal]:ml-1 group-data-[orientation=horizontal]:last:ml-0
group-data-[orientation=vertical]:mb-1 group-data-[orientation=vertical]:last:mb-0"
          [ngClass]="badColor()"
        ></div>
      } @else {
        <div
          class="border-4 group-data-[orientation=horizontal]:ml-1 group-data-[orientation=horizontal]:last:ml-0
group-data-[orientation=vertical]:mb-1 group-data-[orientation=vertical]:last:mb-0"
          [ngClass]="goodColor()"
        ></div>
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
export class SingleBarComponent {
  max = input.required<number>();
  current = input.required<number>();
  goodColor = input.required<string>();
  badColor = input.required<string>();
  orientation = input<'horizontal' | 'vertical'>('horizontal');
}
