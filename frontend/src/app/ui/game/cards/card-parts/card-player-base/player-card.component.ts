import { NgOptimizedImage } from '@angular/common';
import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { imageUrl } from '@domain/card-art/image-url';
import { cardHeights, cardWidths } from '@domain/card.constants';
import { DisplayOptions } from '@domain/display.options';
import { PlayerCardBase } from '@domain/entities/player-card.model';
import { TranslocoPipe } from '@jsverse/transloco';
import { CardOutlineDirective } from '@ui/game/directives/cards/card-outline.directive';
import { CardSkillsComponent } from '../card-skills/card-skills.component';

@Component({
  selector: 'ah-player-card',
  imports: [NgOptimizedImage, CardSkillsComponent, CardOutlineDirective, TranslocoPipe],
  templateUrl: './player-card.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlayerCardComponent {
  protected readonly imageUrl = imageUrl;

  readonly card = input.required<PlayerCardBase>();
  readonly displayOptions = input.required<DisplayOptions>();

  cardWidths = cardWidths;
  cardHeights = cardHeights;
}
