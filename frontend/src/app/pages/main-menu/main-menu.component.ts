import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'ah-main-menu',
  imports: [],
  templateUrl: './main-menu.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class:
      'h-screen w-screen block bg-[url("/assets/images/main-menu.webp")] bg-contain bg-center bg-no-repeat bg-black',
  },
})
// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class MainMenuComponent {}
