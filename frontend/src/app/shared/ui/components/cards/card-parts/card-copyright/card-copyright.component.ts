import { NgOptimizedImage } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
} from '@angular/core';
import { DisplayOptions } from 'shared/domain/display.options';
import { CardInfo } from 'shared/domain/entities/details/card-info.model';
import { ImagesUrlService } from 'shared/services/images-url.service';
import { TrimStartPipe } from 'shared/ui/pipes/trim-start.pipe';

@Component({
  selector: 'ah-card-copyright',
  imports: [NgOptimizedImage, TrimStartPipe],
  templateUrl: './card-copyright.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CardCopyrightComponent {
  protected imagesService = inject(ImagesUrlService);

  readonly card = input.required<CardInfo>();
  readonly displayOptions = input.required<DisplayOptions>();
  iconSize = {
    l: 12,
    m: 8,
    s: 4,
  };
}
