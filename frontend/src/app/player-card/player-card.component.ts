import {ChangeDetectionStrategy, Component, Input} from '@angular/core';
import {NgOptimizedImage} from '@angular/common';
import {PlayerCard} from '../models/player-card';

@Component({
  selector: 'ah-player-card',
  standalone: true,
  imports: [
    NgOptimizedImage
  ],
  templateUrl: './player-card.component.html',
  styles: `:host { @apply block relative; width: 375px; height: 525px; }`,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PlayerCardComponent {
  @Input() card: PlayerCard | undefined;
}
