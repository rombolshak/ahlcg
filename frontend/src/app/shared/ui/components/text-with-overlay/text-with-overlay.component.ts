import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'ah-text-with-overlay',
  imports: [],
  templateUrl: './text-with-overlay.component.html',
  styles: ``,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'relative z-0 inline-block',
  },
})
export class TextWithOverlayComponent {
  readonly text = input.required<string | number>();
}
