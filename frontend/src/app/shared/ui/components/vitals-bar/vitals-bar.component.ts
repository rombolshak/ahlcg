import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { Vitals } from '../../../domain/entities/details/vitals.model';
import { SingleBarComponent } from './single-bar/single-bar.component';

@Component({
  selector: 'ah-vitals-bar',
  imports: [SingleBarComponent],
  templateUrl: './vitals-bar.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'block',
  },
})
export class VitalsBarComponent {
  readonly entity =
    input.required<Partial<{ health: Vitals; sanity: Vitals }>>();
  readonly orientation = input<'horizontal' | 'vertical'>('horizontal');
}
