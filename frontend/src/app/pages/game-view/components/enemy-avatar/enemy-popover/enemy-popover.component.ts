import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
} from '@angular/core';
import { Enemy } from 'shared/domain/enemy.model';
import { CardDetailsTextComponent } from '../../card-details-text/card-details-text.component';
import { NgOptimizedImage } from '@angular/common';
import {
  CreateOverlay,
  ImagesUrlService,
} from 'shared/services/images-url.service';
import { SkillType } from 'shared/domain/player-card.model';

@Component({
  selector: 'ah-enemy-popover',
  imports: [CardDetailsTextComponent, NgOptimizedImage],
  templateUrl: './enemy-popover.component.html',
  host: {
    class: 'bg-zinc-200/80 rounded px-2 py-1',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EnemyPopoverComponent {
  readonly enemy = input.required<Enemy>();
  readonly imageService = inject(ImagesUrlService);
  protected readonly CreateOverlay = CreateOverlay;
  protected readonly SkillType = SkillType;
}
