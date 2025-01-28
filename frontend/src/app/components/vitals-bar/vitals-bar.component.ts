import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { WithHealth } from 'models/player-card.model';
import { AssetState } from 'models/asset.state';
import { SingleBarComponent } from './single-bar/single-bar.component';

@Component({
  selector: 'ah-vitals-bar',
  imports: [SingleBarComponent],
  templateUrl: './vitals-bar.component.html',
  host: {
    class: 'block',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VitalsBarComponent {
  readonly asset = input.required<Partial<WithHealth>>();
  readonly state = input<AssetState>();
  readonly orientation = input<'horizontal' | 'vertical'>('horizontal');
}
