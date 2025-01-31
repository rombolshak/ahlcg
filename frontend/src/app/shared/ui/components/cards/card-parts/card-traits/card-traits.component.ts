import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { PlayerCardBase } from 'shared/domain/player-card.model';
import { DisplayOptions } from 'shared/domain/display.options';

@Component({
  selector: 'ah-card-traits',
  imports: [],
  templateUrl: './card-traits.component.html',
  changeDetection: ChangeDetectionStrategy.Default,
})
export class CardTraitsComponent {
  readonly card = input.required<PlayerCardBase>();
  readonly displayOptions = input.required<DisplayOptions>();
}
