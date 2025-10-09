import { Directive, effect, ElementRef, inject, input } from '@angular/core';
import { Faction } from '../../domain/entities/player-card.model';

@Directive({
  selector: '[ahCardBackground]',
})
export class CardBackgroundDirective {
  private readonly el = inject(ElementRef);

  constructor() {
    effect(() => {
      if (this.lastColor.length) {
        (this.el.nativeElement as HTMLElement).classList.remove(
          ...this.lastColor,
        );
      }

      this.lastColor = this.getColor(this.faction());
      (this.el.nativeElement as HTMLElement).classList.add(
        ...this.lastColor,
        'bg-radial-[at_25%_25%]',
      );
    });
  }

  readonly faction = input.required<Faction>();

  getColor(cardClass: string) {
    switch (cardClass) {
      case 'guardian':
        return ['from-faction-guardian', 'to-faction-guardian-darker'];
      case 'seeker':
        return ['from-faction-seeker-darker', 'to-faction-seeker'];
      case 'rogue':
        return ['from-faction-rogue', 'to-faction-rogue-darker'];
      case 'survivor':
        return ['from-faction-survivor', 'to-faction-survivor-darker'];
      case 'mystic':
        return ['from-faction-mystic', 'to-faction-mystic-darker'];
      case 'neutral':
        return ['from-faction-neutral', 'to-faction-neutral-darker'];
    }

    return [];
  }

  private lastColor: string[] = [];
}
