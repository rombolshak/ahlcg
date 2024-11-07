import {
  ChangeDetectionStrategy,
  Component,
  input,
  InputSignal,
} from '@angular/core';
import { NgOptimizedImage } from '@angular/common';
import { PlayerCard } from '../models/player-card';

@Component({
  selector: 'ah-player-card',
  standalone: true,
  imports: [NgOptimizedImage],
  templateUrl: './player-card.component.html',
  styles: `
    :host {
      @apply relative block;
      width: 375px;
      height: 525px;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlayerCardComponent {
  card: InputSignal<PlayerCard | undefined> = input();

  cardWidth = 375;
  cardHeight = 525;
  illustrationHeight = 273;
}
