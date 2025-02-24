import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
} from '@angular/core';
import { VitalsBarComponent } from 'shared/ui/components/vitals-bar/vitals-bar.component';
import { NgOptimizedImage } from '@angular/common';
import { EnemyWithState } from 'shared/domain/enemy.model';
import { ImagesUrlService } from 'shared/services/images-url.service';

@Component({
  selector: 'ah-enemy-avatar',
  imports: [VitalsBarComponent, NgOptimizedImage],
  templateUrl: './enemy-avatar.component.html',
  host: {
    class: 'bg-zinc-900/70',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EnemyAvatarComponent {
  readonly enemy = input.required<EnemyWithState>();
  readonly imageService = inject(ImagesUrlService);
}
