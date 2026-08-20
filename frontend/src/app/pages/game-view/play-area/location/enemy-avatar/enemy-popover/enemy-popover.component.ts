import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { Enemy } from '@domain/entities/enemy.model';
import { CardDetailsTextComponent } from '@pages/game-view/card-details-text/card-details-text.component';
import { EnemyAttackDisplayComponent } from '@pages/game-view/enemy-attack-display/enemy-attack-display.component';
import { EnemySkillTestsDisplayComponent } from '@pages/game-view/enemy-skill-tests-display/enemy-skill-tests-display.component';
import { VitalsBarComponent } from '@ui/game/vitals-bar/vitals-bar.component';

@Component({
  selector: 'ah-enemy-popover',
  imports: [CardDetailsTextComponent, EnemyAttackDisplayComponent, EnemySkillTestsDisplayComponent, VitalsBarComponent],
  templateUrl: './enemy-popover.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'flex flex-col gap-1 bg-linear-to-b from-zinc-100 to-zinc-300 rounded p-2',
  },
})
export class EnemyPopoverComponent {
  readonly enemy = input.required<Enemy>();
}
