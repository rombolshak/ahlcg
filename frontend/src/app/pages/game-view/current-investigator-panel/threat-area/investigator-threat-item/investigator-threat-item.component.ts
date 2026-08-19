import { NgOptimizedImage } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { CardInfoService } from '@core/card-info.service';
import { imageUrl } from '@domain/card-art/image-url';
import { Enemy } from '@domain/entities/enemy.model';
import { TranslocoDirective } from '@jsverse/transloco';
import { EnemyAttackDisplayComponent } from '@pages/game-view/components/enemy-attack-display/enemy-attack-display.component';
import { EnemySkillTestsDisplayComponent } from '@pages/game-view/components/enemy-skill-tests-display/enemy-skill-tests-display.component';
import { VitalsBarComponent } from '@ui/components/vitals-bar/vitals-bar.component';

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
  private readonly cardInfoService = inject(CardInfoService);
  protected readonly imageUrl = imageUrl;

  readonly enemy = input.required<Enemy>();

  protected readonly info = this.cardInfoService.getCardInfo(this.enemy);
}
