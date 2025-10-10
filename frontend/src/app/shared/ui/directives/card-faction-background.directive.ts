import { Directive, effect, ElementRef, inject, input } from '@angular/core';
import { Faction } from '../../domain/entities/player-card.model';
import { ImagesUrlService } from '../../services/images-url.service';

@Directive({
  selector: '[ahCardFactionBackground]',
})
export class CardFactionBackgroundDirective {
  readonly faction = input.required<Faction>();
  private readonly el = inject(ElementRef);
  private readonly imagesService = inject(ImagesUrlService);

  constructor() {
    const html = this.el.nativeElement as HTMLElement;

    html.classList.add('bg-(image:--bgUrl)', 'bg-cover', 'bg-center');

    effect(() => {
      html.style.setProperty(
        '--bgUrl',
        `url(${this.imagesService.getUrl([
          'card-template',
          'investigator',
          this.faction(),
        ])})`,
      );
    });
  }
}
