import { Directive, effect, ElementRef, input } from '@angular/core';
import { PlayerCardClassType } from 'shared/domain/entities/player-card.model';

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

  readonly cardClass = input.required<PlayerCardClassType>();

  getOutlineColor(cardClass: string) {
    switch (cardClass) {
      case 'guardian':
        return 'outline-blue-400';
      case 'seeker':
        return 'outline-orange-400';
      case 'rogue':
        return 'outline-green-400';
      case 'survivor':
        return 'outline-red-400';
      case 'mystic':
        return 'outline-purple-400';
      case 'neutral':
        return 'outline-gray-400';
    }

    return '';
  }

  private lastColor?: string;
}
