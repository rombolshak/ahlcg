import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
} from '@angular/core';
import { Enemy } from 'shared/domain/entities/enemy.model';
import { CardDetailsTextComponent } from '../../card-details-text/card-details-text.component';
import { NgOptimizedImage } from '@angular/common';
import {
  CreateOverlay,
  ImagesUrlService,
} from 'shared/services/images-url.service';
import { CardInfoService } from '../../../../../shared/services/card-info.service';

@Component({
  selector: 'ah-enemy-popover',
  imports: [CardDetailsTextComponent, NgOptimizedImage],
  templateUrl: './enemy-popover.component.html',
  host: {
    class: 'bg-linear-to-b from-zinc-100 to-zinc-300 rounded px-2 py-1',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EnemyPopoverComponent {
  readonly enemy = input.required<Enemy>();
  readonly imageService = inject(ImagesUrlService);
  protected readonly CreateOverlay = CreateOverlay;

  private readonly cardInfoService = inject(CardInfoService);
  private readonly cardInfo = this.cardInfoService.getCardInfo(this.enemy);
  readonly title = computed(() => this.cardInfo()?.title);
}
