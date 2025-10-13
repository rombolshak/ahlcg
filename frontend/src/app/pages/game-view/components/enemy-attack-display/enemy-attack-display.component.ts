import { NgOptimizedImage } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
} from '@angular/core';
import { Enemy } from '@domain/entities/enemy.model';
import { ImagesUrlService } from '@services/images-url.service';

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
  readonly enemy = input.required<Enemy>();
  protected readonly imagesService = inject(ImagesUrlService);
}
