import { Directive, effect, ElementRef, input } from '@angular/core';
import { PlayerCardClass } from 'models/player-card.model';

@Directive({
  selector: '[ahCardOutline]',
})
export class CardOutlineDirective {
  constructor(private readonly el: ElementRef) {
    (this.el.nativeElement as HTMLElement).classList.add(
      'outline',
      'outline-2',
    );
    effect(() => {
      if (this.lastColor) {
        (this.el.nativeElement as HTMLElement).classList.remove(this.lastColor);
      }

      this.lastColor = this.getOutlineColor(this.cardClass());
      (this.el.nativeElement as HTMLElement).classList.add(this.lastColor);
    });
  }

  readonly cardClass = input.required<PlayerCardClass>();

  getOutlineColor(cardClass: string) {
    switch (cardClass) {
      case PlayerCardClass.Guardian.toString():
        return 'outline-blue-400';
      case PlayerCardClass.Seeker.toString():
        return 'outline-orange-400';
      case PlayerCardClass.Rogue.toString():
        return 'outline-green-400';
      case PlayerCardClass.Survivor.toString():
        return 'outline-red-400';
      case PlayerCardClass.Mystic.toString():
        return 'outline-purple-400';
      case PlayerCardClass.Neutral.toString():
        return 'outline-gray-400';
    }

    return '';
  }

  private lastColor?: string;
}
