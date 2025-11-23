import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'ah-root',
  imports: [RouterOutlet],
  template: ` <router-outlet /> `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'block h-screen w-screen',
  },
})
// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class AppComponent {}
