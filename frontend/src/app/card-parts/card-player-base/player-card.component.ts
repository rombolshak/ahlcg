import { ChangeDetectionStrategy, Component, input } from '@angular/core';
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

  cardWidths = {
    s: 160,
    m: 250,
    l: 375,
  };

  cardHeights = {
    s: 224,
    m: 350,
    l: 525,
  };
}