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
  protected select() {
    alert('qq');
  }

  protected mainItems = ['continue', 'new_game', 'load_game', 'decks', 'settings', 'quit'];
}
