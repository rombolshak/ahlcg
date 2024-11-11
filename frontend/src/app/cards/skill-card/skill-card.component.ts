import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { SkillCard } from '../../models/player-card.model';

@Component({
  selector: 'ah-skill-card',
  standalone: true,
  imports: [],
  template: `
    <p>
      skill-card works!
    </p>
  `,
  styles: ``,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SkillCardComponent {
  card = input.required<SkillCard>();
}
