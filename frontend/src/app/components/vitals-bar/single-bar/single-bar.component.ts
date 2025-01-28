import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { NgClass } from '@angular/common';

@Component({
  selector: 'ah-single-bar',
  imports: [NgClass],
  templateUrl: './single-bar.component.html',
  host: {
    class: 'block',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SingleBarComponent {
  readonly max = input.required<number>();
  readonly current = input.required<number>();
  readonly goodColor = input.required<string>();
  readonly badColor = input.required<string>();
  readonly orientation = input<'horizontal' | 'vertical'>('horizontal');
}
