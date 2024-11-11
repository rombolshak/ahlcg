import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { NgOptimizedImage } from '@angular/common';
import { CreateOverlay, ImagesUrlService } from '../../services/images-url.service';
import { PlayerCardBase } from '../../models/player-card.model';

@Component({
  selector: 'ah-card-skills',
  standalone: true,
  imports: [
    NgOptimizedImage
  ],
  template: `
    @for (skill of card().skills; track $index) {
      <div class="relative">
        <img [ngSrc]="imagesService.getOverlay(CreateOverlay.skillBox(card().class))" width="54"
             height="43" />
        <img
          [ngSrc]="imagesService.getOverlay(CreateOverlay.skillIcon(skill))" width="24" height="24"
          class="absolute left-3 top-2"
        />
      </div>
    }
  `,
  styles: ``,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CardSkillsComponent {
  constructor(protected imagesService: ImagesUrlService) {
  }

  card = input.required<PlayerCardBase>();
  protected readonly CreateOverlay = CreateOverlay;
}
