import { NgOptimizedImage } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { ImagesUrlService } from '@core/images-url.service';
import { Enemy } from '@domain/entities/enemy.model';

@Component({
  selector: 'ah-enemy-attack-display',
  imports: [NgOptimizedImage],
  templateUrl: './enemy-attack-display.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'flex h-auto gap-0.5',
  },
})
export class EnemyAttackDisplayComponent {
  protected readonly imagesService = inject(ImagesUrlService);

  readonly enemy = input.required<Enemy>();
}
