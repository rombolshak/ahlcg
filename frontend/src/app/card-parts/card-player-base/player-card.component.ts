import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { NgOptimizedImage } from '@angular/common';
import { ImagesUrlService } from '../../services/images-url.service';
import { PlayerCardBase } from '../../models/player-card.model';
import { CardSkillsComponent } from '../card-skills/card-skills.component';
import { DisplayOptions } from '../../models/display.options';

@Component({
    selector: 'ah-player-card',
    imports: [NgOptimizedImage, CardSkillsComponent],
    templateUrl: './player-card.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class PlayerCardComponent {
  constructor(protected readonly imagesService: ImagesUrlService) {}

  card = input.required<PlayerCardBase>();
  displayOptions = input.required<DisplayOptions>();
  static cardWidths = {
    s: 160,
    m: 250,
    l: 375,
  };

  static cardHeights = {
    s: 224,
    m: 350,
    l: 525,
  };

  cardWidths = PlayerCardComponent.cardWidths;
  cardHeights = PlayerCardComponent.cardHeights;
}
