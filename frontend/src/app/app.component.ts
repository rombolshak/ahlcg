import { Component } from '@angular/core';
import {RouterOutlet} from '@angular/router';
import {PlayerCardComponent} from './player-card/player-card.component';

@Component({
  selector: 'ah-root',
  standalone: true,
  imports: [RouterOutlet, PlayerCardComponent],
  template: '<ah-player-card></ah-player-card>'
})
export class AppComponent {
}
