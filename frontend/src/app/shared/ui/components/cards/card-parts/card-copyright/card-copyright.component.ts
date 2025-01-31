import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { NgOptimizedImage } from '@angular/common';
import { TrimStartPipe } from 'shared/ui/pipes/trim-start.pipe';
import { ImagesUrlService } from 'shared/services/images-url.service';
import { PlayerCardBase } from 'shared/domain/player-card.model';
import { DisplayOptions } from 'shared/domain/display.options';

@Component({
  selector: 'ah-card-copyright',
  imports: [NgOptimizedImage, TrimStartPipe],
  templateUrl: './card-copyright.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CardCopyrightComponent {
  constructor(protected imagesService: ImagesUrlService) {}

  readonly card = input.required<PlayerCardBase>();
  readonly displayOptions = input.required<DisplayOptions>();
  iconSize = {
    l: 12,
    m: 8,
    s: 4,
  };
}
