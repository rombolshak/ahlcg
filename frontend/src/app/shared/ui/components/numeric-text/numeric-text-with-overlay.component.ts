import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
} from '@angular/core';
import { NumericTextComponent } from './numeric-text.component';

@Component({
  selector: 'ah-numeric-text-with-overlay',
  imports: [NumericTextComponent],
  templateUrl: './numeric-text-with-overlay.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'relative',
  },
})
export class NumericTextWithOverlayComponent {
  public readonly value = input.required<number>();
  public readonly increaseColor = input('var(--color-success-rgb)');
  public readonly decreaseColor = input('var(--color-error-rgb)');
  public readonly invertColors = input(false);
  public readonly animationCompleted = output();
}
