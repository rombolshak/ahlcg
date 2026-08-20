import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { Enemy } from '@domain/entities/enemy.model';
import { InvestigatorSkillComponent } from '@pages/game-view/current-investigator-panel/investigator/investigator-skills/investigator-skill/investigator-skill.component';

@Component({
  selector: 'ah-enemy-skill-tests-display',
  imports: [InvestigatorSkillComponent],
  templateUrl: './enemy-skill-tests-display.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'flex h-auto gap-1',
  },
})
export class EnemySkillTestsDisplayComponent {
  readonly enemy = input.required<Enemy>();
}
