import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { NgOptimizedImage } from '@angular/common';
import { CardSkillsComponent } from '../card-skills/card-skills.component';
import { CardConstants } from 'models/card.constants';
import { ImagesUrlService } from 'services/images-url.service';
import { PlayerCardBase } from 'models/player-card.model';
import { DisplayOptions } from 'models/display.options';

@Component({
  selector: 'ah-player-card',
  imports: [NgOptimizedImage, CardSkillsComponent],
  templateUrl: './player-card.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlayerCardComponent {
  constructor(protected readonly imagesService: ImagesUrlService) {}

  card = input.required<PlayerCardBase>();
  displayOptions = input.required<DisplayOptions>();

  cardWidths = CardConstants.cardWidths;
  cardHeights = CardConstants.cardHeights;
}
