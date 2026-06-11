import { NgOptimizedImage } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
} from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { CardOutlineDirective } from '@shared/directives/cards/card-outline.directive';
import { cardHeights, cardWidths } from 'shared/domain/card.constants';
import { DisplayOptions } from 'shared/domain/display.options';
import { PlayerCardBase } from 'shared/domain/entities/player-card.model';
import { ImagesUrlService } from 'shared/services/images-url.service';
import { CardSkillsComponent } from '../card-skills/card-skills.component';

@Component({
  selector: 'ah-player-card',
  imports: [
    NgOptimizedImage,
    CardSkillsComponent,
    CardOutlineDirective,
    TranslocoPipe,
  ],
  templateUrl: './player-card.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlayerCardComponent {
  protected readonly imagesService = inject(ImagesUrlService);

  readonly card = input.required<PlayerCardBase>();
  readonly displayOptions = input.required<DisplayOptions>();

  cardWidths = cardWidths;
  cardHeights = cardHeights;
}
