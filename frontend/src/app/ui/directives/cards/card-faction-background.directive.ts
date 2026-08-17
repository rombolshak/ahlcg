import { Directive, effect, ElementRef, inject, input } from '@angular/core';
import { ImagesUrlService } from '@core/images-url.service';
import { Faction } from '@domain/entities/player-card.model';

@Directive({
  selector: '[ahCardFactionBackground]',
})
export class CardFactionBackgroundDirective {
  private readonly el = inject(ElementRef);
  private readonly imagesService = inject(ImagesUrlService);

  readonly faction = input.required<Faction>();

  constructor() {
    const html = this.el.nativeElement as HTMLElement;

    html.classList.add('bg-(image:--bgUrl)', 'bg-cover', 'bg-center');

    effect(() => {
      html.style.setProperty('--bgUrl', `url(${this.imagesService.getUrl(['card-template', 'investigator', this.faction()])})`);
    });
  }
}
