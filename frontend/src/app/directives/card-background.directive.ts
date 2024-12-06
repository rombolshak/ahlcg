import { Directive, ElementRef, Input } from '@angular/core';
import { PlayerCardClass } from 'models/player-card.model';

@Directive({
  selector: '[ahCardBackground]',
})
export class CardBackgroundDirective {
  constructor(private readonly el: ElementRef) {}

  @Input() set cardClass(value: PlayerCardClass) {
    this.el.nativeElement.classList.remove(this.lastColor);
    this.lastColor = this.getColor(value);
    this.el.nativeElement.classList.add(this.lastColor);
  }

  getColor(cardClass: string) {
    switch (cardClass) {
      case PlayerCardClass.Guardian:
        return 'bg-blue-200';
      case PlayerCardClass.Seeker:
        return 'bg-orange-200';
      case PlayerCardClass.Rogue:
        return 'bg-green-200';
      case PlayerCardClass.Survivor:
        return 'bg-red-200';
      case PlayerCardClass.Mystic:
        return 'bg-purple-200';
      case PlayerCardClass.Neutral:
        return 'bg-gray-200';
    }

    return '';
  }

  private lastColor?: string;
}
