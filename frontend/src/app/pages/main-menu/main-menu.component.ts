import { ChangeDetectionStrategy, Component } from '@angular/core';
import { ArtPanelComponent } from '@shared/components/art-panel/art-panel.component';

@Component({
  selector: 'ah-main-menu',
  imports: [ArtPanelComponent],
  templateUrl: './main-menu.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class:
      'h-screen w-screen block bg-[url("/assets/images/main-menu.webp")] bg-contain bg-center bg-no-repeat bg-black p-8',
  },
})
// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class MainMenuComponent {}
