import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
} from '@angular/core';
import { VitalsBarComponent } from 'shared/ui/components/vitals-bar/vitals-bar.component';
import { NgOptimizedImage } from '@angular/common';
import { EnemyWithState } from 'shared/domain/enemy.model';
import {
  CreateOverlay,
  ImagesUrlService,
} from 'shared/services/images-url.service';
import { SkillType } from 'shared/domain/player-card.model';
import { EnemyPopoverComponent } from './enemy-popover/enemy-popover.component';

@Component({
  selector: 'ah-enemy-avatar',
  imports: [VitalsBarComponent, NgOptimizedImage, EnemyPopoverComponent],
  templateUrl: './enemy-avatar.component.html',
  host: {
    class: 'relative bg-zinc-900/70',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EnemyAvatarComponent {
  readonly enemy = input.required<EnemyWithState>();
  readonly imageService = inject(ImagesUrlService);
  protected readonly CreateOverlay = CreateOverlay;
  protected readonly SkillType = SkillType;
}
