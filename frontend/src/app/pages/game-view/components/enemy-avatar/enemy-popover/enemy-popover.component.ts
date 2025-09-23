import { NgOptimizedImage } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
} from '@angular/core';
import { TranslocoDirective } from '@jsverse/transloco';
import { Enemy } from 'shared/domain/entities/enemy.model';
import { ImagesUrlService } from 'shared/services/images-url.service';
import { CardInfoService } from '../../../../../shared/services/card-info.service';
import { CardDetailsTextComponent } from '../../card-details-text/card-details-text.component';

@Component({
  selector: 'ah-enemy-popover',
  imports: [CardDetailsTextComponent, NgOptimizedImage, TranslocoDirective],
  templateUrl: './enemy-popover.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class:
      'absolute bg-linear-to-b from-zinc-100 to-zinc-300 rounded px-2 py-1',
  },
})
export class EnemyPopoverComponent {
  readonly enemy = input.required<Enemy>();
  readonly imageService = inject(ImagesUrlService);

  private readonly cardInfoService = inject(CardInfoService);
  private readonly cardInfo = this.cardInfoService.getCardInfo(this.enemy);
  readonly title = computed(() => this.cardInfo()?.title);
}
