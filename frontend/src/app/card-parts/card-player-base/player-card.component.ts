import {
  ChangeDetectionStrategy,
  Component,
  Input,
  input,
} from '@angular/core';
import { NgOptimizedImage } from '@angular/common';
import { ImagesUrlService } from '../../services/images-url.service';
import { PlayerCardBase } from '../../models/player-card.model';
import { CardSkillsComponent } from '../card-skills/card-skills.component';

@Component({
  selector: 'ah-player-card',
  standalone: true,
  imports: [NgOptimizedImage, CardSkillsComponent],
  templateUrl: './player-card.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlayerCardComponent {
  constructor(protected readonly imagesService: ImagesUrlService) {}

  card = input.required<PlayerCardBase>();
  size = input<'s' | 'm' | 'l'>('m');

  cardWidths = {
    s: 125,
    m: 250,
    l: 375,
  };

  cardHeights = {
    s: 192,
    m: 383,
    l: 575,
  };
}
