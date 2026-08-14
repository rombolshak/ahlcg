import { NgOptimizedImage } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { Enemy } from '@domain/entities/enemy.model';
import { ImagesUrlService } from '@services/images-url.service';
import { VitalsBarComponent } from '@shared/components/vitals-bar/vitals-bar.component';
import { EnemyPopoverComponent } from './enemy-popover/enemy-popover.component';

@Component({
  selector: 'ah-enemy-avatar',
  imports: [VitalsBarComponent, NgOptimizedImage, EnemyPopoverComponent],
  templateUrl: './enemy-avatar.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'relative bg-zinc-900/70',
  },
})
export class EnemyAvatarComponent {
  readonly enemy = input<Enemy>();
  readonly hovered = input(false);
  protected readonly imageService = inject(ImagesUrlService);
}
