import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { NgOptimizedImage } from '@angular/common';
import { CardSkillsComponent } from '../card-skills/card-skills.component';
import { cardHeights, cardWidths } from 'shared/domain/card.constants';
import { ImagesUrlService } from 'shared/services/images-url.service';
import { PlayerCardBase } from 'shared/domain/entities/player-card.model';
import { DisplayOptions } from 'shared/domain/display.options';
import { CardOutlineDirective } from 'shared/ui/directives/card-outline.directive';

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
