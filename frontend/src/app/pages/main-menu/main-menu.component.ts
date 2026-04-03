import { ChangeDetectionStrategy, Component } from '@angular/core';
import { MenuItem } from './menu-item';
import { MenuItemsListComponent } from './menu-items-list/menu-items-list.component';

@Component({
  selector: 'ah-main-menu',
  imports: [MenuItemsListComponent],
  templateUrl: './main-menu.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class:
      'h-screen w-screen flex items-center bg-[url("/assets/images/main-menu.webp")] bg-cover bg-center bg-no-repeat bg-black',
  },
})
export class MainMenuComponent {
  protected mainItems: MenuItem[] = [
    {
      name: 'continue',
      tooltip: 'Night of the Zealot\nScenario 1 — The Gathering',
      process: () => {
        alert('continue');
      },
    },
    {
      name: 'new_game',
      process: () => {
        alert('new game');
      },
    },
    {
      name: 'load_game',
      process: () => {
        alert('load game');
      },
    },
    {
      name: 'decks',
      process: () => {
        alert('decks');
      },
    },
    {
      name: 'settings',
      process: () => {
        alert('settings');
      },
    },
  ];
}
