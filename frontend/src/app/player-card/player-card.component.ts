import { ChangeDetectionStrategy, Component } from '@angular/core';
import {NgOptimizedImage} from '@angular/common';

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

}
