import { Directive, ElementRef, Input } from '@angular/core';
import { PlayerCardClass } from 'models/player-card.model';

@Directive({
  selector: '[ahCardOutline]',
})
export class CardOutlineDirective {
  constructor(private readonly el: ElementRef) {
    this.el.nativeElement.classList.add('outline', 'outline-2');
  }

  @Input() set cardClass(value: PlayerCardClass) {
    this.el.nativeElement.classList.remove(this.lastColor);
    this.lastColor = this.getOutlineColor(value);
    this.el.nativeElement.classList.add(this.lastColor);
  }

  getOutlineColor(cardClass: string) {
    switch (cardClass) {
      case PlayerCardClass.Guardian:
        return 'outline-blue-400';
      case PlayerCardClass.Seeker:
        return 'outline-orange-400';
      case PlayerCardClass.Rogue:
        return 'outline-green-400';
      case PlayerCardClass.Survivor:
        return 'outline-red-400';
      case PlayerCardClass.Mystic:
        return 'outline-purple-400';
      case PlayerCardClass.Neutral:
        return 'outline-gray-400';
    }

    return '';
  }

  private lastColor?: string;
}
