import { Directive, effect, ElementRef, input } from '@angular/core';
import { PlayerCardClass } from 'shared/domain/player-card.model';

@Directive({
  selector: '[ahCardBackground]',
})
export class CardBackgroundDirective {
  constructor(private readonly el: ElementRef) {
    effect(() => {
      if (this.lastColor) {
        (this.el.nativeElement as HTMLElement).classList.remove(this.lastColor);
      }

      this.lastColor = this.getColor(this.cardClass());
      (this.el.nativeElement as HTMLElement).classList.add(this.lastColor);
    });
  }

  readonly cardClass = input.required<PlayerCardClass>();

  getColor(cardClass: string) {
    switch (cardClass) {
      case PlayerCardClass.Guardian.toString():
        return 'bg-blue-200';
      case PlayerCardClass.Seeker.toString():
        return 'bg-orange-200';
      case PlayerCardClass.Rogue.toString():
        return 'bg-green-200';
      case PlayerCardClass.Survivor.toString():
        return 'bg-red-200';
      case PlayerCardClass.Mystic.toString():
        return 'bg-purple-200';
      case PlayerCardClass.Neutral.toString():
        return 'bg-gray-200';
    }

    return '';
  }

  private lastColor?: string;
}
