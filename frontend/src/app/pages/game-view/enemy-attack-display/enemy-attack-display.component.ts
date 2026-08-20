import { NgOptimizedImage } from '@angular/common';
import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { imageUrl } from '@domain/card-art/image-url';
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
  protected readonly imageUrl = imageUrl;

  readonly enemy = input.required<Enemy>();
}
