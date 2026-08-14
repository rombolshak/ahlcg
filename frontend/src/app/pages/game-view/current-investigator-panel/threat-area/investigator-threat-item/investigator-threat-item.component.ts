import { NgOptimizedImage } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { Enemy } from '@domain/entities/enemy.model';
import { TranslocoDirective } from '@jsverse/transloco';
import { EnemyAttackDisplayComponent } from '@pages/game-view/components/enemy-attack-display/enemy-attack-display.component';
import { EnemySkillTestsDisplayComponent } from '@pages/game-view/components/enemy-skill-tests-display/enemy-skill-tests-display.component';
import { CardInfoService } from '@services/card-info.service';
import { ImagesUrlService } from '@services/images-url.service';
import { VitalsBarComponent } from '@shared/components/vitals-bar/vitals-bar.component';

@Component({
  selector: 'ah-investigator-threat-item',
  imports: [NgOptimizedImage, TranslocoDirective, VitalsBarComponent, EnemyAttackDisplayComponent, EnemySkillTestsDisplayComponent],
  templateUrl: './investigator-threat-item.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'relative flex p-2 gap-2',
  },
})
export class InvestigatorThreatItemComponent {
  readonly enemy = input.required<Enemy>();
  protected readonly imagesService = inject(ImagesUrlService);
  protected readonly info = inject(CardInfoService).getCardInfo(this.enemy);
}
