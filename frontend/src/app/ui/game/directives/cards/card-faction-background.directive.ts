import { Directive, effect, ElementRef, inject, input } from '@angular/core';
import { imageUrl } from '@domain/card-art/image-url';
import { Faction } from '@domain/entities/player-card.model';

@Directive({
  selector: '[ahCardFactionBackground]',
})
export class CardFactionBackgroundDirective {
  private readonly el = inject(ElementRef);

  readonly faction = input.required<Faction>();

  constructor() {
    const html = this.el.nativeElement as HTMLElement;

    html.classList.add('bg-(image:--bgUrl)', 'bg-cover', 'bg-center');

    effect(() => {
      html.style.setProperty('--bgUrl', `url(${imageUrl(['card-template', 'investigator', this.faction()])})`);
    });
  }
}
