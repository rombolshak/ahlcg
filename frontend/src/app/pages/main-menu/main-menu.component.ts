import { ChangeDetectionStrategy, Component } from '@angular/core';
import { TitleComponent } from '@pages/main-menu/title/title.component';
import { ArtButtonComponent } from '@shared/components/art-button/art-button.component';
import { ArtPanelComponent } from '@shared/components/art-panel/art-panel.component';

@Component({
  selector: 'ah-main-menu',
  imports: [ArtPanelComponent, ArtButtonComponent, TitleComponent],
  templateUrl: './main-menu.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class:
      'h-screen w-screen flex bg-[url("/assets/images/main-menu.webp")] bg-contain bg-center bg-no-repeat bg-black p-8',
  },
})
export class MainMenuComponent {
  protected select() {
    alert('qq');
  }
}
