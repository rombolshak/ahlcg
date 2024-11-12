import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { NgOptimizedImage } from '@angular/common';
import { ImagesUrlService } from '../../services/images-url.service';
import { PlayerCardBase } from '../../models/player-card.model';
import { CardSkillsComponent } from '../card-skills/card-skills.component';

@Component({
  selector: 'ah-card-player-base',
  standalone: true,
  imports: [
    NgOptimizedImage,
    CardSkillsComponent
  ],
  template: `
    <img
      [height]="cardHeight"
      [width]="cardWidth"
      class="-z-10 rounded-xl"
      [ngSrc]="imagesService.getTemplate(card().playerCardType, card().class)"
    />
    <img
      [height]="illustrationHeight"
      [width]="cardWidth"
      class="absolute -top-8 -z-20"
      [ngSrc]="imagesService.getIllustration(card().setInfo)"
    />

    <p class="bold absolute left-5 top-[3.8rem] w-9 text-center font-arno text-[12px] uppercase">
      {{ card().playerCardType }}
    </p>

    <ah-card-skills [card]="card()" class="absolute top-20"></ah-card-skills>
  `,
  styles: ``,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CardPlayerBaseComponent {
  constructor(protected readonly imagesService: ImagesUrlService) {
  }

  card = input.required<PlayerCardBase>();

  cardWidth = 375;
  cardHeight = 575;
  illustrationHeight = 273;
}
