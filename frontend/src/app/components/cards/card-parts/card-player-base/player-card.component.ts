import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { NgOptimizedImage } from '@angular/common';
import { CardSkillsComponent } from '../card-skills/card-skills.component';
import { cardWidths, cardHeights } from 'models/card.constants';
import { ImagesUrlService } from 'services/images-url.service';
import { PlayerCardBase } from 'models/player-card.model';
import { DisplayOptions } from 'models/display.options';
import { CardOutlineDirective } from 'directives/card-outline.directive';

@Component({
  selector: 'ah-player-card',
  imports: [NgOptimizedImage, CardSkillsComponent, CardOutlineDirective],
  templateUrl: './player-card.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlayerCardComponent {
  constructor(protected readonly imagesService: ImagesUrlService) {}

  readonly card = input.required<PlayerCardBase>();
  readonly displayOptions = input.required<DisplayOptions>();

  cardWidths = cardWidths;
  cardHeights = cardHeights;
}
