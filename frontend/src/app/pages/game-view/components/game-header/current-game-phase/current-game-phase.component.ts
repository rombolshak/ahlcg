import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { TranslocoDirective } from '@jsverse/transloco';
import { GamePhase } from 'shared/domain/meta-info';
import { PhaseColor } from './phase-colors.model';

@Component({
  selector: 'ah-current-game-phase',
  imports: [TranslocoDirective],
  templateUrl: './current-game-phase.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'flex flex-col items-center justify-center font-[Arno]',
  },
})
export class CurrentGamePhaseComponent {
  readonly roundNumber = input.required<number>();
  readonly gamePhase = input.required<GamePhase>();
  readonly actingEntityTitle = input<string>();
  readonly colorSet = input.required<PhaseColor>();
}
