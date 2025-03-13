import { Directive, effect, ElementRef, input } from '@angular/core';
import { PlayerCardClass } from 'shared/domain/player-card.model';

@Directive({
  selector: '[ahCardBackground]',
})
export class CardBackgroundDirective {
  constructor(private readonly el: ElementRef) {
    effect(() => {
      if (this.lastColor.length) {
        (this.el.nativeElement as HTMLElement).classList.remove(
          ...this.lastColor,
        );
      }

      this.lastColor = this.getColor(this.cardClass());
      (this.el.nativeElement as HTMLElement).classList.add(
        ...this.lastColor,
        'bg-linear-to-b',
      );
    });
  }

  readonly cardClass = input.required<PlayerCardClass>();

  getColor(cardClass: string) {
    switch (cardClass) {
      case PlayerCardClass.Guardian.toString():
        return ['from-blue-200', 'to-blue-300'];
      case PlayerCardClass.Seeker.toString():
        return ['from-orange-200', 'to-orange-300'];
      case PlayerCardClass.Rogue.toString():
        return ['from-green-200', 'to-green-300'];
      case PlayerCardClass.Survivor.toString():
        return ['from-red-200', 'to-red-300'];
      case PlayerCardClass.Mystic.toString():
        return ['from-purple-200', 'to-purple-300'];
      case PlayerCardClass.Neutral.toString():
        return ['from-gray-200', 'to-gray-300'];
    }

    return [];
  }

  private lastColor: string[] = [];
}
