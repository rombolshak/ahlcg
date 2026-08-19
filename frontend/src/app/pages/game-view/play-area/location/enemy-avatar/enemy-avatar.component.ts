import { NgOptimizedImage } from '@angular/common';
import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { imageUrl } from '@domain/card-art/image-url';
import { Enemy } from '@domain/entities/enemy.model';
import { VitalsBarComponent } from '@ui/game/vitals-bar/vitals-bar.component';
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
  protected readonly imageUrl = imageUrl;

  readonly enemy = input<Enemy>();
  readonly hovered = input(false);
}
