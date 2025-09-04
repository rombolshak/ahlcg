import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'ah-current-game-phase',
  imports: [],
  templateUrl: './current-game-phase.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'flex items-center justify-center',
  },
})
export class CurrentGamePhaseComponent {
  protected roundNumber = 2;
}
