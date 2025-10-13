import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
} from '@angular/core';
import { Enemy } from '@domain/entities/enemy.model';
import { CardDetailsTextComponent } from '@pages/game-view/components/card-details-text/card-details-text.component';
import { EnemyAttackDisplayComponent } from '@pages/game-view/components/enemy-attack-display/enemy-attack-display.component';
import { EnemySkillTestsDisplayComponent } from '@pages/game-view/components/enemy-skill-tests-display/enemy-skill-tests-display.component';
import { CardInfoService } from '@services/card-info.service';
import { ImagesUrlService } from '@services/images-url.service';
import { VitalsBarComponent } from '@shared/components/vitals-bar/vitals-bar.component';

@Component({
  selector: 'ah-enemy-popover',
  imports: [
    CardDetailsTextComponent,
    EnemyAttackDisplayComponent,
    EnemySkillTestsDisplayComponent,
    VitalsBarComponent,
  ],
  templateUrl: './enemy-popover.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class:
      'flex flex-col gap-1 bg-linear-to-b from-zinc-100 to-zinc-300 rounded p-2',
  },
})
export class EnemyPopoverComponent {
  readonly enemy = input.required<Enemy>();
  readonly imageService = inject(ImagesUrlService);

  private readonly cardInfoService = inject(CardInfoService);
  private readonly cardInfo = this.cardInfoService.getCardInfo(this.enemy);
  readonly title = computed(() => this.cardInfo()?.title);
}
