import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { ScopedTranslocoDirective } from '@core/i18n/scoped-transloco.directive';
import { GamePhase } from '@domain/meta-info';
import { TranslocoDirective } from '@jsverse/transloco';
import { I18N_SCOPE } from './i18n/scope';
import { PhaseColor } from './phase-colors.model';

@Component({
  selector: 'ah-current-game-phase',
  imports: [ScopedTranslocoDirective, TranslocoDirective],
  templateUrl: './current-game-phase.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'flex flex-col items-center justify-center font-[Arno]',
  },
})
export class CurrentGamePhaseComponent {
  protected readonly scope = I18N_SCOPE;

  readonly roundNumber = input.required<number>();
  readonly gamePhase = input.required<GamePhase>();
  readonly actingEntityTitle = input<string>();
  readonly colorSet = input.required<PhaseColor>();
}
