import { ChangeDetectionStrategy, Component } from '@angular/core';
import { TitleComponent } from '@pages/main-menu/title/title.component';
import { ArtButtonComponent } from '@shared/components/art-button/art-button.component';
import { TranslocoDirective } from "@jsverse/transloco";

@Component({
  selector: 'ah-main-menu',
  imports: [ArtButtonComponent, TitleComponent, TranslocoDirective],
  templateUrl: './main-menu.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class:
      'h-screen w-screen flex items-center bg-[url("/assets/images/main-menu.webp")] bg-cover bg-center bg-no-repeat bg-black',
  },
})
export class MainMenuComponent {

  protected mainItems = [
    {
      name: 'continue',
      tooltip: 'Night of the Zealot\nScenario 1 — The Gathering',
      process: () => { alert('continue') }
    }, 
    {
      name: 'new_game',
      process: () => { alert('new game') }
    }, 
    {
      name: 'load_game',
      process: () => { alert('load game') }
    }, 
    {
      name: 'decks',
      process: () => { alert('decks') }
    }, 
    {
      name: 'settings',
      process: () => { alert('settings') }
    }
];

}
