import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
} from '@angular/core';
import { NumericTextComponent } from './numeric-text.component';

@Component({
  selector: 'ah-numeric-text-with-overlay',
  templateUrl: './numeric-text-with-overlay.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NumericTextComponent],
  host: {
    class: 'relative',
  },
})
export class NumericTextWithOverlayComponent {
  public readonly value = input.required<number>();
  public readonly increaseColor = input('var(--color-success');
  public readonly decreaseColor = input('var(--color-error)');
  public readonly animationCompleted = output();
}
